from fastapi import FastAPI, Depends, HTTPException, status, Form, File, UploadFile
from fastapi.responses import HTMLResponse, JSONResponse
from fastapi.staticfiles import StaticFiles
from sqlalchemy.orm import Session
from database import SessionLocal, engine
from models import Project, User
from auth import get_current_user, get_db, create_access_token, authenticate_user, get_password_hash
from datetime import timedelta
import os

app = FastAPI()

# Подключаем статические файлы
app.mount("/static", StaticFiles(directory="static"), name="static")

# Endpoint для главной страницы
@app.get("/", response_class=HTMLResponse)
async def read_root():
    with open("templates/index.html", "r", encoding="utf-8") as file:
        return HTMLResponse(content=file.read())

# Endpoint для получения списка проектов
@app.get("/projects")
async def get_projects(db: Session = Depends(get_db)):
    projects = db.query(Project).all()
    return projects

# Endpoint для добавления проекта
@app.post("/add_project")
async def add_project(
    name: str = Form(...),
    description: str = Form(...),
    github_link: str = Form(...),
    image: UploadFile = File(...),
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    # Сохраняем изображение
    image_path = f"static/images/{image.filename}"
    with open(image_path, "wb") as buffer:
        buffer.write(await image.read())

    # Создаем новый проект
    db_project = Project(
        name=name,
        description=description,
        github_link=github_link,
        image_path=image_path
    )
    db.add(db_project)
    db.commit()
    db.refresh(db_project)

    return JSONResponse(status_code=200, content={"message": "Project added successfully"})

# Endpoint для редактирования проекта
@app.put("/edit_project/{project_id}")
async def edit_project(
    project_id: int,
    name: str = Form(...),
    description: str = Form(...),
    github_link: str = Form(...),
    image: UploadFile = File(None),  # Новое изображение (опционально)
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    project = db.query(Project).filter(Project.id == project_id).first()
    if not project:
        raise HTTPException(status_code=404, detail="Проект не найден")

    project.name = name
    project.description = description
    project.github_link = github_link

    if image:
        # Сохраняем новое изображение
        image_path = f"static/images/{image.filename}"
        with open(image_path, "wb") as buffer:
            buffer.write(await image.read())
        project.image_path = image_path

    db.commit()
    db.refresh(project)

    return {"message": "Проект успешно обновлен"}

# Endpoint для удаления проекта
@app.delete("/delete_project/{project_id}")
async def delete_project(
    project_id: int,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    project = db.query(Project).filter(Project.id == project_id).first()
    if not project:
        raise HTTPException(status_code=404, detail="Проект не найден")

    db.delete(project)
    db.commit()

    return {"message": "Проект успешно удален"}

# Endpoint для авторизации
@app.post("/token")
async def login_for_access_token(
    username: str = Form(...),
    password: str = Form(...),
    db: Session = Depends(get_db)
):
    user = authenticate_user(db, username, password)
    if not user:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Incorrect username or password",
        )
    access_token_expires = timedelta(minutes=30)
    access_token = create_access_token(
        data={"sub": user.username}, expires_delta=access_token_expires
    )
    return {"access_token": access_token, "token_type": "bearer"}

# Endpoint для регистрации
@app.post("/register")
async def register_user(
    username: str = Form(...),
    password: str = Form(...),
    db: Session = Depends(get_db)
):
    # Проверяем, существует ли пользователь с таким именем
    existing_user = db.query(User).filter(User.username == username).first()
    if existing_user:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Пользователь с таким именем уже существует",
        )

    # Хэшируем пароль
    hashed_password = get_password_hash(password)

    # Создаем нового пользователя
    new_user = User(username=username, hashed_password=hashed_password)
    db.add(new_user)
    db.commit()
    db.refresh(new_user)

    return JSONResponse(status_code=201, content={"message": "Пользователь успешно зарегистрирован"})

# Запуск сервера
if __name__ == "__main__":
    import uvicorn
    uvicorn.run(app, host="0.0.0.0", port=8040)