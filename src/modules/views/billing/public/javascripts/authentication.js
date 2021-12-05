// No bloat allowed! No JQuery allowed! //

const exclamationCircle = `<i class="fa fa-exclamation-circle"></i>`
const loginUser = async (user) => {
    const loginError = document.getElementById('login-error');
    user.rememberMe = (user.rememberMe == "on")
    try {
        const response = await axios.post("/api/auth", user)
        console.log(response)
        location.reload()
    } catch (e) {
        errorText = e.response.data;
        console.error(e);
        loginError.innerHTML = `${exclamationCircle} ${errorText}`;
    }
}

const registerUser = async (user) => {
    const regError = document.getElementById('register-error');
    try {
        const response = await axios.post("/api/register", user)
        console.log(response)
        location.reload()
    } catch (e) {
        errorText = e.response.data;
        regError.innerHTML = `${exclamationCircle} ${errorText}`;
        console.error(e);
    }
}

const logOut = async () => {
    try {
        const response = await axios.post("/api/user/logout");
        console.log(response)
        window.scrollTo(0, 0) // So users wont have to scroll back up, you can remove this if you want to.
        location.reload();
    } catch (e) {
            console.log(e);
    }
}

const updateUser = async (user, errorT) => {
    try {
        const response = await axios.put("/api/user", user);
        console.log(response)
        if ([200,202].includes(response.status)) location.reload(); // You can reset this back to response.status == 200 if you want to handle that differently. 202 means nothing was updated, 200 means something was updated.
    } catch (e) {
        errorText = e.response.data;
        const updateError = document.getElementById(errorT);
        updateError.innerHTML = `${exclamationCircle} ${errorText}`;
        console.error(e.response);
    }
}
const loginForm = document.querySelector("#login");
const registerForm = document.querySelector('#register');
const editPassButton = document.getElementById("change-pass-button");
const twoFaButton = document.getElementById("2fa-button");
const discordButton = document.getElementById("discord-button");
const editPassForm = document.getElementById("change-password-form");
const switcher = async () => {
    const switchButton = document.querySelector("#switchAuth"),
        switchPrompt = document.querySelector("#switchPrompt"),
        authHeader = document.querySelector("#authHeader");
    switchButton.addEventListener("click", () => {
        loginForm.classList.toggle("hide");
        registerForm.classList.toggle("hide");
        switchButton.innerHTML = switchButton.innerHTML == "Sign-In" ? "Register now!" : "Sign-In";
        switchPrompt.innerHTML = switchButton.innerHTML == "Sign-In" ? "Already have an account?" : "Don't have an account?";
        authHeader.innerHTML = switchButton.innerHTML == "Sign-In" ? "<i class='fa fa-lock'></i> Secure Sign-Up" : "<i class='fa fa-lock'></i> Secure Sign-In";
    });
}

const toggleEditMode = async () => {
    const name = document.querySelector("#accountCard #account-fullName"),
        email = document.querySelector("#accountCard #account-email"),
        button1 = document.querySelector("#accountCard #button1"),
        button2 = document.querySelector("#accountCard #button2"),
        button3 = document.querySelector("#accountCard #button3"),
        button4 = document.querySelector("#accountCard #button4"),
        passwordConfirm = document.querySelector("#account-confirm-password"),
        passwordConfirmLabel = document.querySelector("#account-confirm-password-label");
    name.readOnly ? name.readOnly = false : name.readOnly = true;
    email.readOnly ? email.readOnly = false : email.readOnly = true;
    if (!name.readOnly) {
        button1.style = "visibility: hidden; position: absolute;";
        button2.style = "visibility: hidden; position: absolute;";
        button3.style = "visibility: visible; position: block;";
        button4.style = "visibility: visible; position: block;";
        passwordConfirm.style = "visibility: visible; position: block;";
        passwordConfirmLabel.style = "visibility: visible; position: block;";
    } else {
        button4.style = "visibility: hidden; position: absolute;";
        button3.style = "visibility: hidden; position: absolute;";
        button2.style = "visibility: visible; position: block;";
        button1.style = "visibility: visible; position: block;";
        passwordConfirm.style = "visibility: hidden; position: absolute;";
        passwordConfirmLabel.style = "visibility: hidden; position: absolute;";
    };
};
let switchBool;
const button5 = document.querySelector("#button5"),
button6 = document.querySelector("#button6");
const editPassword = () => {
    if(switchBool){
        switchBool = !switchBool;
        editPassForm.style = "display: none";
        editPassButton.style = "display: block;";
        twoFaButton.style = "display: block;";
        discordButton.style = "display: block;";
        button5.style = "visibility: hidden; position: absolute;";
        button6.style = "visibility: hidden; position: absolute;";
    }else{
        switchBool = !switchBool;
        editPassForm.style = "display: flex";
        editPassButton.style = "display: none;";
        twoFaButton.style = "display: none;";
        discordButton.style = "display: none;";
        button5.style = "visibility: visible; position: block;";
        button6.style = "visibility: visible; position: block;";
    }

}
try{
editPassForm.addEventListener("submit", event => {
    event.preventDefault();
    const password = editPassForm.querySelector('#changepass-current').value;
    const passwordNew = editPassForm.querySelector('#changepass-new').value;
    const passwordConfirm = editPassForm.querySelector('#changepass-confirm').value;
    updateUser({
        password,
        passwordNew,
        passwordConfirm
    },"changepass-error");
})
}catch(e){
    e;
}
window.onload = () => {
    const updateForm = document.querySelector('#accountCard form');
    const logOutButton = document.querySelector('#logOutButton');
    switcher();
    loginForm.addEventListener('submit', event => {
        event.preventDefault();
        const email = loginForm.querySelector('fieldset #login-email').value;
        const password = loginForm.querySelector('fieldset #login-password').value;
        const remember = loginForm.querySelector('fieldset #login-rememberSession').value;
        loginUser({
            email,
            password,
            rememberMe: remember
        });
    });
    registerForm.addEventListener('submit', event => {
        event.preventDefault();
        const name = registerForm.querySelector('fieldset #register-name').value;
        const email = registerForm.querySelector('fieldset #register-email').value;
        const password = registerForm.querySelector('fieldset #register-password').value;
        const passwordConfirm = registerForm.querySelector('fieldset #register-password-confirm').value;
        registerUser({
            name,
            email,
            password,
            passwordConfirm,
            "g-recaptcha-response": grecaptcha.getResponse()
        });
    });
    try {
        updateForm.addEventListener('submit', async event => {
            event.preventDefault();
            const name = updateForm.querySelector('#account-fullName').value;
            const email = updateForm.querySelector('#account-email').value;
            const password = updateForm.querySelector('#account-confirm-password').value;
            //const passwordCheck = axios.post(`/api/auth/verifyPassword`)(password, )
            updateUser({
                name,
                email,
                password
            },"update-error");
        });
    } catch (e) {
        e;
    }
    try {
        logOutButton.addEventListener('click', event => {
            event.preventDefault();
            logOut();
        })
    } catch (e) {
        e;
    }
    try {
        prepareOrderButtons();
    } catch (e) {
        e;
    }
};