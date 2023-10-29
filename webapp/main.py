from time import time
t_ini = time()
from fastapi import FastAPI, UploadFile, File
from fastapi.staticfiles import StaticFiles
from fastapi.responses import FileResponse
#from fastapi.middleware.cors import CORSMiddleware
from typing import Optional
from transformers import pipeline
from pydantic import BaseModel
from fastapi.responses import JSONResponse
from io import BytesIO
import PyPDF2

print('End loading libraries: ', round(time()-t_ini))
t_ini = time()
model_name = "roaltopo/scan-u-doc_question-answer"
qa_pipeline = pipeline(
    "question-answering",
    model=model_name,
)
print('End loading model: ', round(time()-t_ini))
t_ini = time()

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
    # Almacena la información en el diccionario en memoria
    text_storage[uuid] = {
        'text': text_info.text,
        #'pdf': text_info.pdf,
        #'html_url': text_info.html_url
    }

    return {'success': True}

# Ruta para cargar un archivo
@app.post("/upload_file/{uuid}")
async def upload_file(uuid: str, file: UploadFile = File(...)):
    try:
        pdf_content = await file.read()
        pdf_stream = BytesIO(pdf_content)
        pdf_reader = PyPDF2.PdfReader(pdf_stream)
        
        # Aquí puedes trabajar con el objeto pdf_reader
        # por ejemplo, puedes imprimir el número de páginas del PDF
        #print(f"Número de páginas: {len(pdf_reader.pages)}")

        # Variable para almacenar el texto extraído del PDF
        extracted_text = ''

        # Itera sobre todas las páginas del PDF
        for page_num in range(len(pdf_reader.pages)):
            # Obtiene el objeto de la página
            page = pdf_reader.pages[page_num]
            # Extrae el texto de la página y agrégalo a la variable extracted_text
            #extracted_text += page.extract_text().replace('\n', ' ')
            tmp = page.extract_text()
            tmp = tmp.replace('\n', ' ')
            tmp = tmp.replace('  ', ' ')
            tmp = tmp.replace('.  ', '.\n')
            extracted_text += tmp
            if len(extracted_text) > 4000:
                extracted_text = extracted_text[:4000]
                break

        # Almacena la información en el diccionario en memoria
        text_storage[uuid] = {
            'text': extracted_text,
        }

        return JSONResponse(content={'success': True})
    except Exception as e:
        return JSONResponse(content={"message": f"Error al cargar el archivo: {e}"}, status_code=500)

@app.post("/answer_question/{uuid}")
async def answer_question(uuid: str, question_info: QuestionInfo):
    #text_id = question_info.text_id
    question = question_info.question

    # Verifica si el texto con el ID existe en el diccionario
    if uuid not in text_storage:
        return {'error': 'Text not found'}

    # Implementa la lógica de procesamiento de la pregunta aquí
    # En este ejemplo, simplemente devuelve una respuesta fija
    #print(type(text_storage[text_id]), text_storage[text_id]['text'])
    #response = "El texto original es: " + text_storage[text_id]['text']

    #return {'response': response}
    #return qa_pipeline(question=question, context=text_storage[text_id]['text'])
    r = qa_pipeline(question=question, context=text_storage[uuid]['text'], top_k=10)
    #print(r)
    #print('-----------------------------')
    return r[0]


app.mount("/", StaticFiles(directory="static", html=True), name="static")

@app.get("/")
def index() -> FileResponse:
    return FileResponse(path="/app/static/index.html", media_type="text/html")
