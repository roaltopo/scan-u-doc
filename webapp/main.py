"""
# Main module for the ScanUDoc application, containing various endpoints for text processing and benchmarking.

# Author: Rodolfo Torres
# Email: rodolfo.torres@outlook.com
# LinkedIn: https://www.linkedin.com/in/rodolfo-torres-p

# This module includes endpoints for text processing, benchmarking of different pipelines, and handling file uploads.
# The code is licensed under the GPL-3.0 license, which is a widely used open-source license, ensuring that any derivative work is also open source. 
# It grants users the freedom to use, modify, and distribute the software, as well as any modifications or extensions made to it. 
# However, any modified versions of the software must also be licensed under GPL-3.0.

# For more details, please refer to the full text of the GPL-3.0 license at https://www.gnu.org/licenses/gpl-3.0.html.
"""

import torch

# Attempt to import the Intel Extension for PyTorch module.
# Set the 'ipex_enabled' flag accordingly to indicate if the import was successful.
try:
    import intel_extension_for_pytorch as ipex
    ipex_enabled = True
except:
    # If the import fails, set 'ipex_enabled' to False.
    ipex_enabled = False

import time
import numpy as np

from fastapi import FastAPI, UploadFile, File, HTTPException
from fastapi.staticfiles import StaticFiles
from fastapi.responses import FileResponse
from typing import Optional
from transformers import pipeline
from pydantic import BaseModel
from fastapi.responses import JSONResponse
from io import BytesIO
import PyPDF2
from newspaper import Article
from transformers import AutoModelForMultipleChoice, AutoTokenizer, AutoModelForQuestionAnswering, AutoModelForSequenceClassification

try:
    # Check if there is any XPU (any accelerator device) available with PyTorch.
    has_xpu = torch.xpu.device_count()
except:
    # If there is an error during the device count check, set 'has_xpu' to False.
    has_xpu = False

def get_qa_pipeline(optimize=True):
    """
    Creates a question-answering pipeline using a pre-trained model and tokenizer. Optionally applies Intel PyTorch Extension optimizations.

    Parameters:
    - optimize (bool): A flag indicating whether to apply Intel PyTorch Extension optimizations. Default is True.

    Returns:
    - qa_pipeline: A pipeline for question-answering using the specified model and tokenizer.
    """

    # Define the model checkpoint for the question-answering pipeline.
    model_checkpoint = "roaltopo/scan-u-doc_question-answer"
    
    # Initialize the tokenizer and the model for question-answering based on the specified checkpoint.
    tokenizer = AutoTokenizer.from_pretrained(model_checkpoint)
    model = AutoModelForQuestionAnswering.from_pretrained(model_checkpoint)
    model.eval()

    # Determine the device based on the availability of an XPU and the 'ipex_enabled' flag.
    if has_xpu:
        device = 'xpu'
    else:
        device = None

    if ipex_enabled and optimize:
        # Apply Intel PyTorch Extension optimizations if 'ipex_enabled' and 'optimize' are both True.
        model = ipex.optimize(model, weights_prepack=False)
        model = torch.compile(model, backend="ipex")
    
    # Use 'torch.no_grad()' to ensure that no gradient calculations are performed during inference.
    with torch.no_grad():
        # Create a question-answering pipeline using the specified model and tokenizer.
        # Set the torch data type to 'torch.bfloat16' and the device according to the determined value.
        qa_pipeline = pipeline("question-answering", model=model, tokenizer=tokenizer, torch_dtype=torch.bfloat16, device=device)
    return qa_pipeline


def get_bool_q_pipeline(optimize=True):
    """
    Creates a pipeline for text classification for boolean questions using a pre-trained model and tokenizer.
    Optionally applies Intel PyTorch Extension optimizations.

    Parameters:
    - optimize (bool): A flag indicating whether to apply Intel PyTorch Extension optimizations. Default is True.

    Returns:
    - bool_q_pipeline: A pipeline for text classification for boolean questions using the specified model and tokenizer.
    """
    # Define the model checkpoint for the boolean question pipeline.
    model_checkpoint = "roaltopo/scan-u-doc_bool-question"
    
    # Initialize the tokenizer and the model for text classification based on the specified checkpoint.
    tokenizer = AutoTokenizer.from_pretrained(model_checkpoint)
    model = AutoModelForSequenceClassification.from_pretrained(model_checkpoint)
    model.eval()

    # Determine the device based on the availability of an XPU and the 'ipex_enabled' flag.
    if has_xpu:
        device = 'xpu'
    else:
        device = None

    if ipex_enabled and optimize:
        # Apply Intel PyTorch Extension optimizations if 'ipex_enabled' and 'optimize' are both True.
        model = ipex.optimize(model, weights_prepack=False)
        model = torch.compile(model, backend="ipex")
    
    # Use 'torch.no_grad()' to ensure that no gradient calculations are performed during inference.
    with torch.no_grad():
        # Create a text classification pipeline for boolean questions using the specified model and tokenizer.
        # Set the torch data type to 'torch.bfloat16' and the device according to the determined value.
        bool_q_pipeline = pipeline("text-classification", model=model, tokenizer=tokenizer, torch_dtype=torch.bfloat16, device=device)
    return bool_q_pipeline

        
def get_bool_a_model(optimize=True):
    """
    Retrieves the pre-trained model and tokenizer for answering boolean questions.
    Optionally applies Intel PyTorch Extension optimizations.

    Parameters:
    - optimize (bool): A flag indicating whether to apply Intel PyTorch Extension optimizations. Default is True.

    Returns:
    - model: The pre-trained model for answering boolean questions.
    - tokenizer: The tokenizer corresponding to the model.
    """
    # Define the model checkpoint for the boolean answer model.
    model_checkpoint = "roaltopo/scan-u-doc_bool-answer"

    # Initialize the model and the tokenizer for multiple-choice answers based on the specified checkpoint.
    model = AutoModelForMultipleChoice.from_pretrained(model_checkpoint)
    tokenizer = AutoTokenizer.from_pretrained(model_checkpoint)

    if has_xpu:
        # If an XPU is available, move the model to the XPU device.
        model = model.to("xpu")

    model.eval()

    if ipex_enabled and optimize:
        # Apply Intel PyTorch Extension optimizations if 'ipex_enabled' and 'optimize' are both True.
        model = ipex.optimize(model, weights_prepack=False)
        model = torch.compile(model, backend="ipex")
    return model, tokenizer


# Initialize the question-answering pipeline using the 'get_qa_pipeline' function.
qa_pipeline = get_qa_pipeline()
# Initialize the pipeline for text classification for boolean questions using the 'get_bool_q_pipeline' function.
bool_q_pipeline = get_bool_q_pipeline()
# Retrieve the model and tokenizer for answering boolean questions using the 'get_bool_a_model' function.
bool_a_model, bool_a_tokenizer = get_bool_a_model()

# Initialize the FastAPI application.
app = FastAPI()

# In-memory dictionary for storing information during runtime.
text_storage = {}

class TextInfo(BaseModel):
    """
    A Pydantic Base model representing information related to text data.

    Attributes:
    - text (str): Optional. The text data to be processed.
    - pdf (bytes): Optional. The PDF data to be processed.
    - html_url (str): Optional. The URL pointing to the HTML content to be processed.
    """
    text: Optional[str] = None
    pdf: Optional[bytes] = None
    html_url: Optional[str] = None

class QuestionInfo(BaseModel):
    """
    A Pydantic Base model representing information related to a specific question.

    Attributes:
    - question (str): The question to be answered or classified.
    - allow_bool (bool): Optional. Flag indicating whether to allow boolean question types. Default is False.
    """
    question: str
    allow_bool: Optional[bool] = False


def predict_boolean_answer(text, question, model=bool_a_model, tokenizer=bool_a_tokenizer):
    """
    Predicts a boolean answer for the given text and question using the specified model and tokenizer.

    Parameters:
    - text (str): The text data for context.
    - question (str): The question to be answered.
    - model: The pre-trained model for answering boolean questions. Default is 'bool_a_model'.
    - tokenizer: The tokenizer corresponding to the model. Default is 'bool_a_tokenizer'.

    Returns:
    - dict: A dictionary containing the predicted boolean answer.
    """
    # Mapping for converting predicted labels to human-readable answers.
    id2label = {0: "No", 1: "Yes"}
    text += '\n'
    question += '\n'
    
    # Tokenize the text and question inputs for the model.
    inputs = tokenizer([[text, question+'no'], [text, question+'yes']], return_tensors="pt", padding=True)
    labels = torch.tensor(0).unsqueeze(0)

    if has_xpu:
        # If an XPU is available, move the inputs and labels to the XPU device.
        inputs = inputs.to("xpu")
        labels = labels.to("xpu")
    
    # Perform the forward pass with the model to get the outputs and logits.
    outputs = model(**{k: v.unsqueeze(0) for k, v in inputs.items()}, labels=labels)
    logits = outputs.logits
    
    # Return the predicted boolean answer in a dictionary format.
    return {'answer': id2label[int(logits.argmax().item())]}


def get_qa_score(question, context, optimize, num_times, warmup_rounds):
    """
    Calculates the average inference time for the question-answering pipeline.

    Parameters:
    - question (str): The question to be answered.
    - context (str): The context for the question.
    - optimize (bool): A flag indicating whether to apply optimizations to the pipeline.
    - num_times (int): The number of times the inference is run to calculate the average time.
    - warmup_rounds (int): The number of initial rounds to be ignored for calculating the average time.

    Returns:
    - pipeline_inference_time: The average inference time for the question-answering pipeline.
    """
    if optimize:
        pipeline = qa_pipeline
    else:
        pipeline = get_qa_pipeline(optimize=False)

    with torch.no_grad():
        latency_list = []
        for i in range(num_times):
            time_start = time.time()
            answer = pipeline(question=question, context=context)
            if i >= warmup_rounds:
                latency_list.append(time.time() - time_start)
        pipeline_inference_time = np.mean(latency_list)
    return pipeline_inference_time


def get_bool_q_score(question, optimize, num_times, warmup_rounds):
    """
    Calculates the average inference time for the text classification pipeline for boolean questions.

    Parameters:
    - question (str): The question to be classified.
    - optimize (bool): A flag indicating whether to apply optimizations to the pipeline.
    - num_times (int): The number of times the inference is run to calculate the average time.
    - warmup_rounds (int): The number of initial rounds to be ignored for calculating the average time.

    Returns:
    - pipeline_inference_time: The average inference time for the text classification pipeline for boolean questions.
    """
    if optimize:
        pipeline = bool_q_pipeline
    else:
        pipeline = get_bool_q_pipeline(optimize=False)
    
    with torch.no_grad():
        latency_list = []
        for i in range(num_times):
            time_start = time.time()
            answer = pipeline(question)
            if i >= warmup_rounds:
                latency_list.append(time.time() - time_start)
        pipeline_inference_time = np.mean(latency_list)
    return pipeline_inference_time


def get_bool_a_score(text, question, optimize, num_times, warmup_rounds):
    """
    Calculates the average inference time for answering boolean questions.

    Parameters:
    - text (str): The text data for context.
    - question (str): The question to be answered.
    - optimize (bool): A flag indicating whether to apply optimizations to the pipeline.
    - num_times (int): The number of times the inference is run to calculate the average time.
    - warmup_rounds (int): The number of initial rounds to be ignored for calculating the average time.

    Returns:
    - pipeline_inference_time: The average inference time for answering boolean questions.
    """
    if not optimize:
        model, tokenizer = get_bool_a_model(optimize=optimize)
    else:
        model = bool_a_model
        tokenizer = bool_a_tokenizer
    
    with torch.no_grad():
        latency_list = []
        for i in range(num_times):
            time_start = time.time()
            answer = predict_boolean_answer(text, question, model=model, tokenizer=tokenizer)
            if i >= warmup_rounds:
                latency_list.append(time.time() - time_start)
        pipeline_inference_time = np.mean(latency_list)
    return pipeline_inference_time



@app.post("/store_text/{uuid}")
async def store_text(uuid: str, text_info: TextInfo):
    """
    Stores text data in the in-memory dictionary using the provided UUID.

    Parameters:
    - uuid (str): The unique identifier for the stored text data.
    - text_info (TextInfo): A Pydantic Base model containing information related to the text data.

    Returns:
    - dict: A dictionary indicating the success of the storing operation.
    """
    try:
        url = text_info.html_url.strip() if text_info.html_url else None
        if url:
            article = Article(url)
            article.download()
            article.parse()
            text = f'{article.title}\n{article.text}'
        elif text_info.text:
            text = text_info.text
        else:
            raise HTTPException(status_code=400, detail="Invalid Option: 'url' or 'text' required in text_info.")

        # Store information in the in-memory dictionary
        text_storage[uuid] = {
            'text': text,
            'url': text_info.html_url
        }

        return {'success': True}
    except Exception as e:
        error_message = f"Error: {str(e)}"
        print(error_message)
        raise HTTPException(status_code=500, detail="Internal Server Error: An unexpected error occurred.")


@app.post("/upload_file/{uuid}")
async def upload_file(uuid: str, file: UploadFile = File(...)):
    """
    Uploads a file and extracts text content to be stored in the in-memory dictionary using the provided UUID.

    Parameters:
    - uuid (str): The unique identifier for the stored text data.
    - file (UploadFile): The file to be uploaded.

    Returns:
    - JSONResponse: A JSON response indicating the success or failure of the file upload and text extraction process.
    """
    try:
        file_extension = file.filename.split('.')[-1].lower()

        if file_extension == 'pdf':
            content = await file.read()
            stream = BytesIO(content)
            reader = PyPDF2.PdfReader(stream)

            extracted_text = ''

            for page_num in range(len(reader.pages)):
                page = reader.pages[page_num]
                tmp = page.extract_text()
                tmp = tmp.replace('\n', ' ')
                tmp = tmp.replace('  ', ' ')
                tmp = tmp.replace('.  ', '.\n')
                extracted_text += tmp
                if len(extracted_text) > 4000:
                    extracted_text = extracted_text[:4000]
                    break

        elif file_extension == 'txt':
            content = await file.read()
            extracted_text = content.decode('utf-8')

        else:
            raise ValueError("Unsupported file format.")

        text_storage[uuid] = {
            'text': extracted_text,
        }

        return JSONResponse(content={'success': True})

    except Exception as e:
        return JSONResponse(content={"message": f"Error while uploading the file: {e}"}, status_code=500)


@app.post("/answer_question/{uuid}")
async def answer_question(uuid: str, question_info: QuestionInfo):
    """
    Answers a given question based on the stored text corresponding to the provided UUID.

    Parameters:
    - uuid (str): The unique identifier for the stored text data.
    - question_info (QuestionInfo): A Pydantic Base model containing information related to the question.

    Returns:
    - dict: A dictionary containing the answer to the question.
    """
    bool_activate = question_info.allow_bool

    question = question_info.question

    # Verify if the text with the ID exists in the dictionary
    if uuid not in text_storage:
        return {'error': 'Text not found'}

    answer = qa_pipeline(question=question, context=text_storage[uuid]['text'])
    if bool_activate:
        is_bool_inference = bool_q_pipeline(question)
        if is_bool_inference[0]['label'] == 'YES':
            answer = predict_boolean_answer(answer['answer'], question)

    return answer


@app.get("/benchmark")
async def benchmark(question: str, context: str, num_times: int, warmup_rounds: int):
    """
    Conducts benchmarking for the different pipeline components based on the specified parameters.

    Parameters:
    - question (str): The question to be used for benchmarking.
    - context (str): The context for the question.
    - num_times (int): The number of times the inference is run to calculate the average time.
    - warmup_rounds (int): The number of initial rounds to be ignored for calculating the average time.

    Returns:
    - dict: A dictionary containing the benchmarking results for the question-answering and boolean pipelines.
    """
    qa =  { get_qa_score(question, context, False, num_times, warmup_rounds), get_qa_score(question, context, True, num_times, warmup_rounds)}
    bool_q =  { get_bool_q_score(question, False, num_times, warmup_rounds), get_bool_q_score(question, True, num_times, warmup_rounds)}

    answer = qa_pipeline(question=question, context=context)
    bool_a =  { get_bool_a_score(answer['answer'], question, False, num_times, warmup_rounds), get_bool_a_score(answer['answer'], question, True, num_times, warmup_rounds)}

    return {'has_xpu': has_xpu, 'ipex_enabled': ipex_enabled,'qa': qa, 'bool_q': bool_q, 'bool_a': bool_a, 'answer': answer['answer']}



app.mount("/", StaticFiles(directory="static", html=True), name="static")

@app.get("/")
def index() -> FileResponse:
    """
    Returns the index.html file as the main landing page.

    Returns:
    - FileResponse: The index.html file as the main landing page.
    """
    return FileResponse(path="/app/static/index.html", media_type="text/html")

