// No bloat allowed! No JQuery allowed! //

const exclamationCircle = `<i class="fa fa-exclamation-circle"></i>`
const checkmark = `<i class="fas fa-check"></i>`

const twofa = () => {
    Swal.fire({
        title: '2-Factor authentication',
        text: "Helps secure your account by requiring a physical key available in either Google authenticator, or other 2FA client.",
        inputAttributes: {
          autocapitalize: 'off'
        },
        showCancelButton: true,
        confirmButtonText: "Secure my account",
        allowOutsideClick: () => !Swal.isLoading()
      }).then((result) => {
        if (result.isConfirmed) {
          Swal.fire({
            title: "Scan the QR Code with your 2FA Client.",
            text: `Or use this code: pkogkeogkepe-ehútkebúoekbú-bpkbopebs`,
            input: "text",
            imageUrl: "https://upload.wikimedia.org/wikipedia/commons/thumb/d/d0/QR_code_for_mobile_English_Wikipedia.svg/1200px-QR_code_for_mobile_English_Wikipedia.svg.png",
            imageWidth: 200,
            imageHeight: 200,
            inputAttributes: {
                autocapitalize: 'off'
              },
              showCancelButton: true,
              confirmButtonText: "Secure my account",
              showLoaderOnConfirm: true,
          })
        }
      })
}

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
const updateForm = document.querySelector('#accountCard form');
const updateUser = async (user, errorT) => {
    try {
        const response = await axios.put("/api/user", user);
        console.log(response)
        if ([200, 202].includes(response.status)){
            toggleEditMode();
            const div = document.createElement("div");
            const h2 = document.createElement("h3");
            h2.innerHTML = `${checkmark} User info changed successfully! Reloading page...`
            div.appendChild(h2);
            div.style = "display: grid;place-items: center; width: 100%; height: 30px; background-color: limegreen; position: fixed; left: 0; top: -30px; text-align: center; transition: ease 1s;";
            h2.style = "margin: 0;color: white;"
            document.body.appendChild(div);
            div.style="display: grid;place-items: center; width: 100%; height: 30px; background-color: limegreen; position: fixed; left: 0; top: 0; text-align: center; transition: ease 1s;"
        setTimeout(()=>{
            location.reload()
        },1500);
        } // You can reset this back to response.status == 200 if you want to handle that differently. 202 means nothing was updated, 200 means something was updated.
    } catch (e) {
        errorText = e.response.data;
        const updateError = document.getElementById(errorT);
        updateError.innerHTML = `${exclamationCircle} ${errorText}`;
        console.error(e.response);
    }
}
const editPassForm = document.getElementById("change-password-form");
const loginForm = document.querySelector("#login");
const registerForm = document.querySelector('#register');
const editPassButton = document.getElementById("change-pass-button");
const twoFaButton = document.getElementById("2fa-button");
const discordButton = document.getElementById("discord-button");
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
const editPassword = () => {
    Swal.fire({
        title: 'Change Password',
        html: '<input type="password" class="swal2-input" placeholder="Current Password" required id="changepass-current"><br>\
        <input type="password" class="swal2-input" placeholder="New Password" required id="changepass-new"><br>\
        <input type="password" class="swal2-input" placeholder="Confirm New Password" required id="changepass-confirm"><br>',
        inputAttributes: {
          autocapitalize: 'off'
        },
        showCancelButton: true,
        confirmButtonText: "Change Password",
        allowOutsideClick: () => !Swal.isLoading(),
        preConfirm: async () => {
            const oldPass = Swal.getPopup().querySelector('#changepass-current').value
            const newPass = Swal.getPopup().querySelector('#changepass-new').value
            const newPassConfirm = Swal.getPopup().querySelector('#changepass-confirm').value
            if (!oldPass || !newPass || !newPassConfirm) {
              Swal.showValidationMessage(`Please fill all input fields.`)
            }else{
                try {
                    const response = await axios.put("/api/user", {name: null, email: null, password: oldPass, passwordNew: newPass, passwordConfirm: newPassConfirm});
                    console.log(response)
                    if ([200, 202].includes(response.status)) {
                        return { password: oldPass, new_password: newPass, new_password_confirm: newPassConfirm }
                    }
                } catch (e) {
                    Swal.showValidationMessage(e.response.data)
                }
            }
          }
      }).then((result) => {
        if (result.isConfirmed) {
          Swal.fire({
            title: "Successfully changed password",
            icon: "success"
          })
        }
      })
}
const deleteAccount = () => {
    Swal.fire({
        title: 'Delete Account',
        icon: "warning",
        html: "<p>By deleting your account all your services will be stopped immediately without refundation.<br><br>You will be signed out immediately,\
        your account will be locked and it will enter a redemption period for 7 days.<br><br>You can message us at support@ametrine.host or open\
        a ticket on our Discord server to retrieve your account. <br><br>After 7 days, all your data will be deleted from all our databases.</p>",
        input: 'checkbox',
        inputPlaceholder: 'I understand the consequences of deleting my account.',
        inputAttributes: {
          autocapitalize: 'off'
        },
        showCancelButton: true,
        confirmButtonText: "Continue",
        allowOutsideClick: () => !Swal.isLoading(),
        preConfirm: async (checkbox) => {
            if(!checkbox) return Swal.showValidationMessage("You must agree to have read this disclaimer before continuing.")
          }
      }).then((result) => {
        if (result.isConfirmed) {
          Swal.fire({
            title: "Delete account",
            text: "By proceeding, your account will be locked and you will be signed out. Your services will be terminated shortly after.",
            input: "password",
            inputPlaceholder: "password",
            showCancelButton: true,
            confirmButtonText: "Delete Account",
            allowOutsideClick: () => !Swal.isLoading(),
            preConfirm: async (password) => {
                if(!password) return Swal.showValidationMessage("You must write your password into the input.");
              }
          })
        }
      })
}
window.onload = () => {
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
            }, "update-error");
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