document.addEventListener("DOMContentLoaded", function () {
    const loginForm = document.getElementById("login-form");
    const registerForm = document.getElementById("register-form");
    const addProjectForm = document.getElementById("add-project-form");
    const loginSection = document.getElementById("login-section");
    const addProjectSection = document.getElementById("add-project-section");
    const projectsList = document.getElementById("projects-list");

    if (!projectsList) {
        console.error("Элемент projects-list не найден!");
        return;
    }

    let token = null;

    // Загрузка проектов при загрузке страницы
    loadProjects();

    // Обработка входа
    loginForm.addEventListener("submit", async function (event) {
        event.preventDefault();
        const username = document.getElementById("username").value;
        const password = document.getElementById("password").value;

        const response = await fetch("/token", {
            method: "POST",
            headers: {
                "Content-Type": "application/x-www-form-urlencoded",
            },
            body: `username=${username}&password=${password}`,
        });

        if (response.ok) {
            const data = await response.json();
            token = data.access_token;
            loginSection.style.display = "none";
            addProjectSection.style.display = "block";
            loadProjects(); // Перезагружаем проекты после авторизации
        } else {
            alert("Ошибка авторизации");
        }
    });

    // Обработка регистрации
    registerForm.addEventListener("submit", async function (event) {
        event.preventDefault();
        const username = document.getElementById("register-username").value;
        const password = document.getElementById("register-password").value;

        const response = await fetch("/register", {
            method: "POST",
            headers: {
                "Content-Type": "application/x-www-form-urlencoded",
            },
            body: `username=${username}&password=${password}`,
        });

        if (response.ok) {
            alert("Пользователь успешно зарегистрирован");
        } else {
            const errorData = await response.json();
            alert(`Ошибка регистрации: ${errorData.detail}`);
        }
    });

    // Обработка добавления проекта
    addProjectForm.addEventListener("submit", async function (event) {
        event.preventDefault();
        const formData = new FormData();
        formData.append("name", document.getElementById("project-name").value);
        formData.append("description", document.getElementById("project-description").value);
        formData.append("github_link", document.getElementById("project-github-link").value);
        formData.append("image", document.getElementById("project-image").files[0]);

        const response = await fetch("/add_project", {
            method: "POST",
            headers: {
                "Authorization": `Bearer ${token}`,
            },
            body: formData,
        });

        if (response.ok) {
            alert("Проект успешно добавлен");
            loadProjects();
        } else {
            alert("Ошибка при добавлении проекта");
        }
    });

    // Загрузка проектов
    async function loadProjects() {
        console.log("Загрузка проектов...");
        try {
            const response = await fetch("/projects");
            console.log("Ответ сервера:", response);
            if (!response.ok) {
                throw new Error(`Ошибка HTTP: ${response.status}`);
            }
            const projects = await response.json();
            console.log("Проекты:", projects);
            projectsList.innerHTML = "";
            projects.forEach(project => {
                const li = document.createElement("li");
                li.innerHTML = `
                    <div class="project-view">
                        <h3>${project.name}</h3>
                        <img src="${project.image_path}" alt="${project.name}" onerror="this.style.display='none'">
                        <p>${project.description}</p>
                        <a href="${project.github_link}" target="_blank">Ссылка на GitHub</a>
                        ${token ? `
                            <button onclick="showEditForm(${project.id})">Редактировать</button>
                            <button onclick="deleteProject(${project.id})">Удалить</button>
                        ` : ""}
                    </div>
                    <div class="project-edit" id="edit-form-${project.id}" style="display: none;">
                        <h3>Редактирование проекта</h3>
                        <form onsubmit="saveProject(event, ${project.id})">
                            <input type="text" id="edit-name-${project.id}" value="${project.name}" required>
                            <textarea id="edit-description-${project.id}" required>${project.description}</textarea>
                            <input type="text" id="edit-github-link-${project.id}" value="${project.github_link}" required>
                            <input type="file" id="edit-image-${project.id}" accept="image/*">
                            <button type="submit">Сохранить</button>
                            <button type="button" onclick="hideEditForm(${project.id})">Отмена</button>
                        </form>
                    </div>
                `;
                projectsList.appendChild(li);
            });
        } catch (error) {
            console.error("Ошибка при загрузке проектов:", error);
        }
    }

    // Отображение формы редактирования
    window.showEditForm = function (projectId) {
        const editForm = document.getElementById(`edit-form-${projectId}`);
        const projectView = editForm.previousElementSibling;
        projectView.style.display = "none";
        editForm.style.display = "block";
    };

    // Скрытие формы редактирования
    window.hideEditForm = function (projectId) {
        const editForm = document.getElementById(`edit-form-${projectId}`);
        const projectView = editForm.previousElementSibling;
        editForm.style.display = "none";
        projectView.style.display = "block";
    };

    // Сохранение изменений
    window.saveProject = async function (event, projectId) {
        event.preventDefault();
        const name = document.getElementById(`edit-name-${projectId}`).value;
        const description = document.getElementById(`edit-description-${projectId}`).value;
        const githubLink = document.getElementById(`edit-github-link-${projectId}`).value;
        const imageFile = document.getElementById(`edit-image-${projectId}`).files[0];

        const formData = new FormData();
        formData.append("name", name);
        formData.append("description", description);
        formData.append("github_link", githubLink);
        if (imageFile) {
            formData.append("image", imageFile);
        }

        console.log("Данные для отправки:", { name, description, githubLink, imageFile });

        const response = await fetch(`/edit_project/${projectId}`, {
            method: "PUT",
            headers: {
                "Authorization": `Bearer ${token}`,
            },
            body: formData,
        });

        if (response.ok) {
            alert("Проект успешно обновлен");
            loadProjects(); // Перезагружаем список проектов
        } else {
            const errorData = await response.json();
            console.error("Ошибка при обновлении проекта:", errorData);
            alert("Ошибка при обновлении проекта");
        }
    };

    // Удаление проекта
    window.deleteProject = async function (projectId) {
        if (confirm("Вы уверены, что хотите удалить этот проект?")) {
            const response = await fetch(`/delete_project/${projectId}`, {
                method: "DELETE",
                headers: {
                    "Authorization": `Bearer ${token}`,
                },
            });

            if (response.ok) {
                alert("Проект успешно удален");
                loadProjects();
            } else {
                alert("Ошибка при удалении проекта");
            }
        }
    };
});