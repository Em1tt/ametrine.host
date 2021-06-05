// No bloat allowed! No JQuery allowed! //
const exclamationCircle = `<i class="fa fa-exclamation-circle"></i>`
const loginUser = async (user) => {
    const loginError = document.getElementById('loginerror');
    const url = "https://amethyst.host/api/auth"
    console.log(user)
    user.rememberMe = (user.rememberMe == "on")
    //const url = "/api/auth"
    try {
        const response = await axios.post(url, user)
        location.reload()
    } catch (e) {
        let errorText = "Unknown Error (Look in Console for more details)";
        switch (e.toString()) {
            case "Error: Request failed with status code 403":
                errorText = "Email or Password is incorrect."
                break;
            case "Error: Request failed with status code 404":
                errorText = "User not found.";    
                break;
        }
        loginError.innerHTML = `${exclamationCircle} ${errorText}`;
    }
}

const registerUser = async (user) => {
    const regError = document.getElementById('regerror');
    const url = "https://amethyst.host/api/register"
    //const url = "/api/auth"
    try {
        const response = await axios.post(url, user)
        console.log(response)
        location.reload()
    } catch (e) {
        let errorText = "Unknown Error (Look in Console for more details)";
        switch (e.toString()) {
            case "Error: Request failed with status code 406":
                errorText = "Password must not be less than 6 characters."
                break;
            case "Error: Request failed with status code 409":
                errorText = "The email you provided has already been used!";    
                break;
        }
        regError.innerHTML = `${exclamationCircle} Error: ${errorText}`;
    }
}

function onLoad() {
    const loginForm = document.getElementsByClassName('login-main').item(0).querySelector('form')
    const registerForm = document.getElementsByClassName('register-main').item(0).querySelector('form')
    loginForm.addEventListener('submit', event => {
        event.preventDefault();
        const email = loginForm.querySelector('#login-email').value;
        const password = loginForm.querySelector('#login-password').value;
        const remember = loginForm.getElementsByClassName('flex-align').item(0).querySelector('#remember').value;
        loginUser({
            email,
            password,
            rememberMe: remember
        });
    });
    registerForm.addEventListener('submit', event => {
        event.preventDefault();
        const name = registerForm.querySelector('#name').value;
        const email = registerForm.querySelector('#email').value;
        const password = registerForm.querySelector('#password').value;
        const passwordConfirm = registerForm.querySelector('#password-confirm').value;
        if (password != passwordConfirm) return 403;
        registerUser({
            name,
            email,
            password,
        });
    });
}
