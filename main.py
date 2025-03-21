from fastapi import FastAPI, UploadFile, File, HTTPException, Header, Depends, Body
from fastapi.responses import JSONResponse
from pdf2image import convert_from_path
import PyPDF2
import docx2txt
import pytesseract
from openai import OpenAI
import io
import os
import tempfile
import base64
from dotenv import load_dotenv
import google.generativeai as genai
from pydantic import BaseModel
from typing import List, Dict, Any, Optional
import json
from datetime import datetime

load_dotenv()
ALLOWED_EXTENSIONS = {".pdf", ".docx"}
AUTH_KEY = os.getenv("AUTH_KEY")

# 自定義 JSON 序列化函數，處理 datetime 對象
def serialize_for_json(obj):
    """將對象轉換為 JSON 可序列化的格式"""
    if isinstance(obj, datetime):
        return obj.isoformat()
    elif isinstance(obj, dict):
        return {k: serialize_for_json(v) for k, v in obj.items()}
    elif isinstance(obj, list):
        return [serialize_for_json(item) for item in obj]
    else:
        return obj

def verify_auth_key(auth_key: str = Header(...)):
    if auth_key != AUTH_KEY:
        raise HTTPException(status_code=403, detail="Unauthorized")

# 新增的數據模型
class RubricLevel(BaseModel):
    score: int
    description: str

class RubricCriteria(BaseModel):
    id: str
    name: str
    description: str
    weight: int
    levels: List[RubricLevel]

class Rubric(BaseModel):
    id: str
    name: str
    description: str
    criteria: List[RubricCriteria]
    totalWeight: int
    createdAt: datetime = None
    updatedAt: datetime = None

# 評分結果模型
class GradingResult(BaseModel):
    score: int
    imageUnderstanding: Optional[str] = None
    analysis: str
    criteriaScores: List[Dict[str, Any]] = []
    strengths: List[str] = []
    improvements: List[str] = []
    overallSuggestions: str = ""
    # 完整的LLM輸出，不限制格式
    rawContent: Dict[str, Any] = {}

# 存儲評分標準的簡單內存數據庫
rubrics_db = {}

app = FastAPI()

GEMINI_API_KEY = os.getenv("GEMINI_API_KEY")
genai.configure(api_key=GEMINI_API_KEY)
client = OpenAI(api_key=os.getenv("OPENAI_API_KEY"))

RUBRICS_FILE = "rubrics.json"

def load_rubrics():
    """從 JSON 文件加載評分標準"""
    global rubrics_db
    if os.path.exists(RUBRICS_FILE):
        try:
            with open(RUBRICS_FILE, "r", encoding="utf-8") as file:
                rubrics_db = json.load(file)
        except json.JSONDecodeError:
            rubrics_db = {}  # 如果文件損壞，則重置
    else:
        rubrics_db = {}

def save_rubrics():
    """將評分標準存入 JSON 文件"""
    with open(RUBRICS_FILE, "w", encoding="utf-8") as file:
        json.dump(rubrics_db, file, ensure_ascii=False, indent=4)

load_rubrics()

def analyze_with_gemini(text: str) -> str:
    model = genai.GenerativeModel("gemini-1.5-pro")
    response = model.generate_content([{"type": "text", "text": text, "language": "zh"}])
    return response.text

def allowed_file(filename: str) -> bool:
    return os.path.splitext(filename.lower())[1] in ALLOWED_EXTENSIONS

def describe_image(image):
    try:
        buffered = io.BytesIO()
        image.save(buffered, format="PNG")
        base64_image = base64.b64encode(buffered.getvalue()).decode("utf-8")

        response = client.chat.completions.create(
            model="gpt-4o",
            messages=[
                {"role": "system", "content": "你是一位專業的文件與圖像分析專家，請用中文提供詳細的分析。"},
                {"role": "user", "content": [
                    {"type": "text", "text": "請詳細分析這張圖片，包括佈局、內容、關鍵點、視覺元素等。"},
                    {"type": "image_url", "image_url": {"url": f"data:image/png;base64,{base64_image}"}},
                ]},
            ],
            max_tokens=1000,
        )
        return response.choices[0].message.content
    except Exception:
        return describe_image_with_gemini(image)

def describe_image_with_gemini(image):
    buffered = io.BytesIO()
    image.save(buffered, format="PNG")
    base64_image = base64.b64encode(buffered.getvalue()).decode("utf-8")

    model = genai.GenerativeModel("gemini-1.5-pro")
    request_data = [
        {"text": "請詳細分析這張圖片，包括佈局、顏色、內容等。"},
        {"inline_data": {"mime_type": "image/png", "data": base64_image}}
    ]
    response = model.generate_content(request_data)
    return response.text

def extract_text_from_pdf(file: bytes, use_ocr: bool = False) -> str:
    if use_ocr:
        with tempfile.NamedTemporaryFile(delete=False, suffix=".pdf") as temp_file:
            temp_file.write(file)
            temp_file_path = temp_file.name
        images = convert_from_path(temp_file_path)
        text = "".join(pytesseract.image_to_string(img) for img in images)
        os.unlink(temp_file_path)
        return text
    else:
        pdf_reader = PyPDF2.PdfReader(io.BytesIO(file))
        return "".join(page.extract_text() or "" for page in pdf_reader.pages)

def extract_text_from_docx(file: bytes) -> str:
    return docx2txt.process(io.BytesIO(file))

@app.post("/analyze-document/")
async def analyze_document(file: UploadFile = File(...), use_ocr: bool = False,  auth_key: str = Depends(verify_auth_key)):
    try:
        if not allowed_file(file.filename):
            raise HTTPException(status_code=400, detail="Unsupported file type.")

        file_content = await file.read()
        text = extract_text_from_pdf(file_content, use_ocr) if file.filename.endswith(".pdf") else extract_text_from_docx(file_content)

        try:
            response = client.chat.completions.create(
                model="gpt-4o",
                messages=[
                    {"role": "system", "content": "你是一位文件分析專家，請用中文提供詳細的分析。"},
                    {"role": "user", "content": f"請分析以下文件內容：\n\n{text[:15000]}"}
                ],
                max_tokens=2000,
            )
            analysis = response.choices[0].message.content
        except Exception:
            analysis = analyze_with_gemini(text)

        return JSONResponse(content={"filename": file.filename, "text": text, "analysis": analysis})
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Error processing file: {str(e)}")

@app.post("/analyze-images/")
async def analyze_images(file: UploadFile = File(...)):
    if not file.filename.endswith(".pdf"):
        raise HTTPException(status_code=400, detail="Only PDF supported for image analysis.")
    try:
        file_content = await file.read()
        with tempfile.NamedTemporaryFile(delete=False, suffix=".pdf") as temp_file:
            temp_file.write(file_content)
            temp_file_path = temp_file.name
        images = convert_from_path(temp_file_path)
        results = [describe_image(img) for img in images]
        os.unlink(temp_file_path)
        return JSONResponse(content={"filename": file.filename, "descriptions": results})
    except Exception:
        results = [describe_image_with_gemini(img) for img in images]
        return JSONResponse(content={"filename": file.filename, "descriptions": results})

# 新增評分標準API
@app.post("/rubrics/")
async def create_rubric(rubric: Rubric, auth_key: str = Depends(verify_auth_key)):
    try:
        # 設置創建和更新時間
        now = datetime.now()
        rubric.createdAt = now
        rubric.updatedAt = now
        
        # 使用 model_dump() 或兼容性方法
        try:
            # Pydantic v2
            rubric_data = rubric.model_dump()
        except AttributeError:
            # Pydantic v1
            rubric_data = rubric.dict()
        
        # 序列化 datetime 對象
        rubric_data = serialize_for_json(rubric_data)
        
        rubrics_db[rubric.id] = rubric_data
        save_rubrics() 

        return JSONResponse(content={"success": True, "rubric_id": rubric.id})
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Error creating rubric: {str(e)}")

@app.get("/rubrics/")
async def list_rubrics(auth_key: str = Depends(verify_auth_key)):
    try:
        # 添加日誌記錄
        print(f"Getting all rubrics. Current count: {len(rubrics_db)}")
        
        # 轉換成列表並處理 datetime 對象
        rubrics = serialize_for_json(list(rubrics_db.values()))
        
        # 返回結果
        return JSONResponse(content={"rubrics": serialize_for_json(list(rubrics_db.values()))})
    except Exception as e:
        # 記錄詳細錯誤
        import traceback
        error_detail = traceback.format_exc()
        print(f"Error listing rubrics: {str(e)}\n{error_detail}")
        
        raise HTTPException(status_code=500, detail=f"Error listing rubrics: {str(e)}")

@app.get("/rubrics/{rubric_id}")
async def get_rubric(rubric_id: str, auth_key: str = Depends(verify_auth_key)):
    if rubric_id not in rubrics_db:
        raise HTTPException(status_code=404, detail="Rubric not found")
    
    try:
        # 獲取數據並處理 datetime 對象
        return JSONResponse(content=serialize_for_json(rubrics_db[rubric_id]))
        
    except Exception as e:
        # 記錄詳細錯誤
        import traceback
        error_detail = traceback.format_exc()
        print(f"Error getting rubric {rubric_id}: {str(e)}\n{error_detail}")
        
        raise HTTPException(status_code=500, detail=f"Error getting rubric: {str(e)}")

@app.delete("/rubrics/{rubric_id}")
async def delete_rubric(rubric_id: str, auth_key: str = Depends(verify_auth_key)):
    if rubric_id not in rubrics_db:
        raise HTTPException(status_code=404, detail="Rubric not found")

    del rubrics_db[rubric_id]
    save_rubrics()  
    return JSONResponse(content={"success": True})

@app.put("/rubrics/{rubric_id}")
async def update_rubric(rubric_id: str, rubric: Rubric, auth_key: str = Depends(verify_auth_key)):
    if rubric_id not in rubrics_db:
        raise HTTPException(status_code=404, detail="Rubric not found")
    
    try:
        # 保留原始創建時間
        original_created_at = rubrics_db[rubric_id].get("createdAt")
        
        # 設置更新時間
        now = datetime.now()
        rubric.createdAt = original_created_at or now  # 保留原始創建時間
        rubric.updatedAt = now
        
        # 使用 model_dump() 或兼容性方法
        try:
            # Pydantic v2
            rubric_data = rubric.model_dump()
        except AttributeError:
            # Pydantic v1
            rubric_data = rubric.dict()
        
        # 更新數據庫
        rubrics_db[rubric_id] = rubric_data
        save_rubrics()  # 儲存到 JSON
        
        return JSONResponse(content={"success": True})
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Error updating rubric: {str(e)}")

# 評分文檔的新API
@app.post("/grade-document/")
async def grade_document(
    file: UploadFile = File(...), 
    rubric_id: str = Body(...),
    auth_key: str = Depends(verify_auth_key)
):
    try:
        print(f"收到評分請求 - 檔案: {file.filename}, 大小: {file.size}, 評分標準ID: {rubric_id}")
        
        if not allowed_file(file.filename):
            print(f"不支援的檔案類型: {file.filename}")
            raise HTTPException(status_code=400, detail="Unsupported file type.")
            
        if rubric_id not in rubrics_db:
            print(f"找不到評分標準ID: {rubric_id}")
            raise HTTPException(status_code=404, detail="Rubric not found")
            
        # 獲取評分標準並處理 datetime 對象
        rubric = serialize_for_json(rubrics_db[rubric_id])
        print(f"使用評分標準: '{rubric['name']}', 有 {len(rubric['criteria'])} 個評分條目")
        
        # 讀取文件內容
        file_content = await file.read()
        file_size_kb = len(file_content) / 1024
        print(f"已讀取檔案內容，大小: {file_size_kb:.2f} KB")
        
        # 提取文字內容
        text = extract_text_from_pdf(file_content) if file.filename.endswith(".pdf") else extract_text_from_docx(file_content)
        text_length = len(text)
        print(f"已提取文字內容，長度: {text_length} 字符，前50字符預覽: {text[:50]}")
        
        # 對 PDF 檔案進行圖像分析
        image_descriptions = []
        if file.filename.endswith(".pdf"):
            print("檔案是PDF，開始分析文件中的圖像...")
            try:
                # 將檔案寫入臨時文件
                with tempfile.NamedTemporaryFile(delete=False, suffix=".pdf") as temp_file:
                    temp_file.write(file_content)
                    temp_file_path = temp_file.name
                
                # 將PDF轉換為圖像
                images = convert_from_path(temp_file_path)
                print(f"從PDF中提取了 {len(images)} 個頁面/圖像")
                
                # 分析每個圖像
                if images:
                    print("開始分析PDF中的圖像...")
                    for i, img in enumerate(images[:3]):  # 限制處理前3個圖像，避免處理時間過長
                        print(f"分析圖像 {i+1}/{len(images)}...")
                        description = describe_image(img)
                        image_descriptions.append(f"圖像 {i+1} 分析: {description}")
                    
                # 清理臨時文件
                os.unlink(temp_file_path)
                print(f"完成圖像分析，共分析了 {len(image_descriptions)} 個圖像")
            except Exception as e:
                print(f"圖像分析過程中出錯: {str(e)}")
                # 繼續處理，即使圖像分析失敗
        
        # 構建評分提示
        criteria_prompt = "\n".join([
            f"## 評分標準 {i+1}: {criteria['name']} (權重: {criteria['weight']}%)\n"
            f"描述: {criteria['description']}\n"
            f"評分等級:\n" + 
            "\n".join([f"- {level['score']}分: {level['description']}" for level in criteria['levels']])
            for i, criteria in enumerate(rubric['criteria'])
        ])
        
        # 加入圖像分析結果到提示中
        image_analysis_text = ""
        if image_descriptions:
            image_analysis_text = "\n\n# 文件圖像分析\n" + "\n\n".join(image_descriptions)
        
        prompt = f"""
        回復請你使用中文，你是一位專業的評分助手。請根據以下評分標準，對提交的文件進行詳盡的評分和深入分析。
        
        # 文件內容
        {text[:15000]}
        
        {image_analysis_text}

        # 評分標準
        {criteria_prompt}

        # 評分要求
        1. 首先，請提供對文件內容（尤其是圖片，若有的話）的理解和看法
        2. 針對每個評分標準提供具體分數和非常詳細的評語，包括具體例子和改進建議
        3. 詳細列出文件的所有優點，並提供具體的例證
        4. 詳細列出所有需要改進的地方，並提供具體的改進方法和例子
        5. 提供深入且實用的整體建議，可以分點說明
        6. 計算總分時，考慮每個標準的權重百分比
        7. 在分析中關注文件的結構、邏輯性、表達清晰度，並提供具體評論
        
        # 重要的分數處理說明
        1. 即使評分標準只提供了幾個參考等級（如1分、3分、5分），你可以根據文件質量給予更精確的分數
        2. 例如：可以給予2分、2.5分、3.5分、4分等中間分數，不必僅限於預設等級分數
        3. 對於每個評分標準，分數範圍是0-5分，可使用一位小數的精確度（如4.3分）
        4. 最終總分將換算為100分制，例如：總分為4.5分相當於90分
        5. 請提供詳細理由說明為何給出這個分數，並在可能的情況下引用文件中的具體例子

        # 回應格式說明
        請盡可能詳細地分析，不要擔心回應過長。我們需要深入的評價和具體的建議，以幫助作者全面了解其優勢和不足。

        請以JSON格式返回評分結果，包含以下字段:
        - score: 總分 (0-100)
        - imageUnderstanding: 對文件中圖片的理解和看法（若無圖片，則可以省略此字段）
        - analysis: 完整的評分分析，所有的想法、觀察和評語都放在這裡，請提供非常詳盡的分析
        - criteriaScores: 每個評分標準的具體得分和詳細評語，格式為數組，每個元素包含 name, score, comments 字段
        - strengths: 文件優點列表，每一項都應該具體且有實例支持
        - improvements: 需要改進的地方列表，每一項都應該包含具體建議
        - overallSuggestions: 詳細的整體建議，分點說明如何提升文件質量
        """
        
        print(f"已構建評分提示，長度: {len(prompt)} 字符")
        if image_descriptions:
            print(f"評分提示包含 {len(image_descriptions)} 個圖像分析結果")
        
        try:
            # 使用OpenAI進行評分
            print(f"正在調用 GPT-4o 進行評分...")
            start_time = datetime.now()
            response = client.chat.completions.create(
                model="gpt-4o",
                messages=[
                    {"role": "system", "content": "你是一位專業的評分助手，請根據評分標準提供公正、詳細的評分分析。"},
                    {"role": "user", "content": prompt}
                ],
                response_format={ "type": "json_object" },
                max_tokens=8000,
            )
            end_time = datetime.now()
            time_taken = (end_time - start_time).total_seconds()
            
            result_text = response.choices[0].message.content
            print(f"GPT-4o 回應已收到，耗時: {time_taken:.2f} 秒，回應長度: {len(result_text)} 字符")
            
            # 記錄結果前100個字符，方便識別不同評分
            print(f"評分結果預覽: {result_text[:200]}...")
            
            # 解析完整的JSON響應
            complete_result = json.loads(result_text)
            print(f"評分結果 - 總分: {complete_result.get('score', 0)}")
            
            # 直接返回所有內容，保留LLM的完整輸出
            return JSONResponse(content=complete_result)
            
        except Exception as e:
            # 記錄詳細錯誤
            import traceback
            error_detail = traceback.format_exc()
            print(f"GPT-4o 評分失敗: {str(e)}\n{error_detail}")
            
            # 備選方案：使用Gemini進行評分
            print("嘗試使用 Gemini 作為備選方案...")
            prompt_text = f"請根據以下評分標準對文件評分：\n{criteria_prompt}\n\n文件內容：\n{text[:3000]}"
            result = analyze_with_gemini(prompt_text)
            
            # 返回簡化版結果
            return JSONResponse(content={
                "score": 75,  # 預設分數
                "analysis": result,
                "criteriaScores": [],
                "strengths": ["(Gemini 備用評分)"],
                "improvements": ["無法提供詳細評分"],
                "overallSuggestions": "請重試使用主要評分系統",
                "rawContent": {"gemini_output": result}
            })
            
    except Exception as e:
        # 記錄詳細錯誤
        import traceback
        error_detail = traceback.format_exc()
        print(f"評分過程中發生錯誤: {str(e)}\n{error_detail}")
        
        raise HTTPException(status_code=500, detail=f"Error grading document: {str(e)}")


