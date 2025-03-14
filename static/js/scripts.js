// Переключение темы
const themeToggle = document.getElementById('theme-toggle');
themeToggle.addEventListener('change', function () {
    document.body.classList.toggle('dark-theme', this.checked);
    localStorage.setItem('theme', this.checked ? 'dark' : 'light');
});

document.addEventListener("DOMContentLoaded", function () {
    const loginForm = document.getElementById("login-form");
    // const registerForm = document.getElementById("register-form");
    const addProjectForm = document.getElementById("add-project-form");
    const loginSection = document.getElementById("login-section");
    const addProjectSection = document.getElementById("add-project-section");
    const projectsList = document.getElementById("projects-list");
    const savedTheme = localStorage.getItem('theme');
    if (savedTheme === 'dark') {
        document.body.classList.add('dark-theme');
        themeToggle.checked = true;
    }

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

            // Разблокируем кнопки
            const editButtons = document.querySelectorAll("button[onclick^='editProject']");
            const deleteButtons = document.querySelectorAll("button[onclick^='deleteProject']");
            editButtons.forEach(button => button.disabled = false);
            deleteButtons.forEach(button => button.disabled = false);

            loadProjects(); // Перезагружаем проекты после авторизации
        } else {
            alert("Ошибка авторизации");
        }
    });

    // Обработка регистрации
    // registerForm.addEventListener("submit", async function (event) {
    //     event.preventDefault();
    //     const username = document.getElementById("register-username").value;
    //     const password = document.getElementById("register-password").value;
    //
    //     const response = await fetch("/register", {
    //         method: "POST",
    //         headers: {
    //             "Content-Type": "application/x-www-form-urlencoded",
    //         },
    //         body: `username=${username}&password=${password}`,
    //     });
    //
    //     if (response.ok) {
    //         alert("Пользователь успешно зарегистрирован");
    //     } else {
    //         const errorData = await response.json();
    //         alert(`Ошибка регистрации: ${errorData.detail}`);
    //     }
    // });

    // Обработка добавления проекта
    addProjectForm.addEventListener("submit", async function (event) {
        event.preventDefault();

        if (!token) {
            Swal.fire({
                icon: 'warning',
                title: 'Необходима авторизация',
                text: 'Для выполнения этого действия необходимо авторизоваться.',
            });
            return;
        }

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
        try {
            const response = await fetch("/projects");
            if (!response.ok) {
                throw new Error(`Ошибка HTTP: ${response.status}`);
            }
            const projects = await response.json();
            console.log("Загруженные проекты:", projects);

            projectsList.innerHTML = "";
            projects.forEach(project => {
                const li = document.createElement("li");
                li.setAttribute("data-project-id", project.id);
                li.innerHTML = `
                    <div class="project-view">
                        <h3>${project.name}</h3>
                        <img src="${project.image_path}" alt="${project.name}" onerror="this.style.display='none'">
                        <p>${project.description}</p>
                        <a href="${project.github_link}" target="_blank">Ссылка на GitHub</a>
                        <button onclick="editProject(${project.id})">Редактировать</button>
                        <button onclick="deleteProject(${project.id})">Удалить</button>
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
    window.editProject = function (projectId) {
        if (!token) {
            Swal.fire({
                icon: 'warning',
                title: 'Необходима авторизация',
                text: 'Для выполнения этого действия необходимо авторизоваться.',
            });
            return;
        }

        // Находим родительский элемент проекта
        const projectElement = document.querySelector(`#projects-list li[data-project-id="${projectId}"]`);
        if (!projectElement) {
            console.error("Проект не найден. Проверьте data-project-id и projectId:", projectId);
            return;
        }

        // Находим форму редактирования и блок с проектом внутри родительского элемента
        const editForm = projectElement.querySelector(".project-edit");
        const projectView = projectElement.querySelector(".project-view");

        if (!editForm || !projectView) {
            console.error("Форма редактирования или блок проекта не найдены");
            return;
        }

        // Скрываем блок с проектом и показываем форму редактирования
        projectView.style.display = "none";
        editForm.style.display = "block";
    };

    // Удаление проекта
    window.deleteProject = async function (projectId) {
        if (!token) {
            Swal.fire({
                icon: 'warning',
                title: 'Необходима авторизация',
                text: 'Для выполнения этого действия необходимо авторизоваться.',
            });
            return;
        }

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

    // Скрытие формы редактирования
    window.hideEditForm = function (projectId) {
        const projectElement = document.querySelector(`#projects-list li[data-project-id="${projectId}"]`);
        if (!projectElement) {
            console.error("Проект не найден");
            return;
        }

        const editForm = projectElement.querySelector(".project-edit");
        const projectView = projectElement.querySelector(".project-view");

        if (!editForm || !projectView) {
            console.error("Форма редактирования или блок проекта не найдены");
            return;
        }

        // Скрываем форму редактирования и показываем блок с проектом
        editForm.style.display = "none";
        projectView.style.display = "block";
    };

    // Сохранение изменений
    window.saveProject = async function (event, projectId) {
        event.preventDefault();

        if (!token) {
            Swal.fire({
                icon: 'warning',
                title: 'Необходима авторизация',
                text: 'Для выполнения этого действия необходимо авторизоваться.',
            });
            return;
        }

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

        // Редактирование информации "Обо мне"
    window.showEditAboutForm = function () {
        if (!token) {
            Swal.fire({
                icon: 'warning',
                title: 'Необходима авторизация',
                text: 'Для выполнения этого действия необходимо авторизоваться.',
            });
            return;
        }

        const aboutText = document.getElementById('about-me-text').innerText;
        document.getElementById('edit-about-text').value = aboutText;
        document.getElementById('edit-about-form').style.display = 'block';
    };

    window.hideEditAboutForm = function () {
        document.getElementById('edit-about-form').style.display = 'none';
    };

    window.saveAboutInfo = function (event) {
        event.preventDefault();
        const newAboutText = document.getElementById('edit-about-text').value;
        document.getElementById('about-me-text').innerText = newAboutText;
        hideEditAboutForm();
    };

    // Редактирование стека технологий
    window.showEditSkillsForm = function () {
        if (!token) {
            Swal.fire({
                icon: 'warning',
                title: 'Необходима авторизация',
                text: 'Для выполнения этого действия необходимо авторизоваться.',
            });
            return;
        }

        const skillsList = document.getElementById('skills-list');
        const skillsText = Array.from(skillsList.children).map(li => li.innerText).join('\n');
        document.getElementById('edit-skills-text').value = skillsText;
        document.getElementById('edit-skills-form').style.display = 'block';
    };

    window.hideEditSkillsForm = function () {
        document.getElementById('edit-skills-form').style.display = 'none';
    };

    window.saveSkillsInfo = function (event) {
        event.preventDefault();
        const newSkillsText = document.getElementById('edit-skills-text').value;
        const skillsList = document.getElementById('skills-list');
        skillsList.innerHTML = newSkillsText.split('\n').map(skill => `<li>${skill}</li>`).join('');
        hideEditSkillsForm();
    };
});