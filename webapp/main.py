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

model_name = "roaltopo/scan-u-doc_question-answer"
qa_pipeline = pipeline(
    "question-answering",
    model=model_name,
)

app = FastAPI()

# Diccionario en memoria para almacenar información
text_storage = {}

class TextInfo(BaseModel):
    text: Optional[str] = None
    pdf: Optional[bytes] = None
    html_url: Optional[str] = None

class QuestionInfo(BaseModel):
    question: str

@app.post("/store_text/{uuid}")
async def store_text(uuid: str, text_info: TextInfo):
    try:
        url = text_info.html_url.strip() if text_info.html_url else None
        if url:
            print('url:', url)
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

# Ruta para cargar un archivo
@app.post("/upload_file/{uuid}")
async def upload_file(uuid: str, file: UploadFile = File(...)):
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
    question = question_info.question

    # Verifica si el texto con el ID existe en el diccionario
    if uuid not in text_storage:
        return {'error': 'Text not found'}

    r = qa_pipeline(question=question, context=text_storage[uuid]['text'], top_k=10)
    return r[0]


app.mount("/", StaticFiles(directory="static", html=True), name="static")

@app.get("/")
def index() -> FileResponse:
    return FileResponse(path="/app/static/index.html", media_type="text/html")
