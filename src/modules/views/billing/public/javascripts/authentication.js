// No bloat allowed! No JQuery allowed! //

const exclamationCircle = `<i class="fa fa-exclamation-circle"></i>`;
const checkmark = `<i class="fas fa-check"></i>`;

const params = new Proxy(new URLSearchParams(window.location.search), {
  get: (searchParams, prop) => searchParams.get(prop),
});

const twofa = () => {
  Swal.fire({
    title: "2-Factor authentication",
    text: "Helps secure your account by requiring a physical key available in either Google authenticator, or other 2FA client.",
    inputAttributes: {
      autocapitalize: "off",
    },
    showCancelButton: true,
    confirmButtonText: "Secure my account",
    allowOutsideClick: () => !Swal.isLoading(),
  }).then(async (result) => {
    if (result.isConfirmed) {
      try {
        const response = await axios.post("/api/user/2fa");
        console.log(response);
        Swal.fire({
          title: "Scan the QR Code with your 2FA Client.",
          text: `Or use this code: ${response.data.secret}`,
          input: "text",
          inputPlaceholder: "Temporary 2-FA code",
          imageUrl: response.data.qr,
          imageWidth: 200,
          imageHeight: 200,
          inputAttributes: {
            autocapitalize: "off",
          },
          showCancelButton: true,
          confirmButtonText: "Secure my account",
          showLoaderOnConfirm: true,
          allowOutsideClick: () => !Swal.isLoading(),
          preConfirm: async (code) => {
            if (!code || isNaN(code.split(" ").join(""))) {
              Swal.showValidationMessage(
                `Please put your temporary 2-FA code into the field above.`
              );
            } else {
              try {
                const response = await axios.post(`/api/user/2fa`, {code: code});
                console.log(response);
                Swal.fire({
                  title: "Save these backup codes",
                  icon: "warning",
                  html: `<p><b>They're used in case you lose access to your 2FA device.</b><br><br>${response.data.backupCodes
                    .map(
                      (i) => `${response.data.backupCodes.indexOf(i) + 1}. ${i}`
                    )
                    .join("<br>")}</p>`,
                  showCancelButton: false,
                  confirmButtonText: "Done",
                  preConfirm: () => {
                    location.reload();
                  },
                });
              } catch (e) {
                console.error(e);
                Swal.showValidationMessage(e.response.data);
              }
            }
          },
        });
      } catch (e) {
        console.log(e.response.data);
      }
    }
  });
};

const loginUser = async (user) => {
  const loginError = document.getElementById("login-error");
  try {
    const response = await axios.post("/api/auth", user);
    console.log(response);
    if (response.data["2fa"]) {
      Swal.fire({
        title: "2 Factor Authentication",
        html: `<p><b>This account is secured by 2 factor authentication.</b></p>`,
        input: "text",
        inputPlaceholder: "2FA code",
        showCancelButton: false,
        confirmButtonText: "Done",
        preConfirm: async (twofa) => {
          try {
            user.code = twofa;
            user.type = "2fa";
            console.log(user);
            const response = await axios.post("/api/auth", user);
            console.log(response);
            if(response.data.email){
              location.reload();
            }
          } catch (e) {
            Swal.showValidationMessage(e.response.data);
            console.log(e);
          }
        },
      })
    } else {
      location.reload();
    }
  } catch (e) {
    errorText = e.response.data;
    console.error(e);
    loginError.innerHTML = `${exclamationCircle} ${errorText}`;
  }
};

const registerUser = async (user) => {
  const regError = document.getElementById("register-error");
  try {
    const response = await axios.post("/api/register", user);
    console.log(response);
    location.reload();
  } catch (e) {
    errorText = e.response.data;
    regError.innerHTML = `${exclamationCircle} ${errorText}`;
    console.error(e);
  }
};

const logOut = async () => {
  try {
    const response = await axios.post("/api/user/logout");
    console.log(response);
    window.scrollTo(0, 0); // So users wont have to scroll back up, you can remove this if you want to.
    Swal.fire({
      title: "Sign out successful",
      text: "See you next time!",
      icon: "success",
      timer: 2000,
      timerProgressBar: true,
      showCancelButton: false,
      confirmButtonText: "Alright",
    }).then(() => {
      location.reload();
    });
  } catch (e) {
    console.log(e);
  }
};
const updateForm = document.querySelector("#accountCard form");
const updateUser = async (user, errorT) => {
  try {
    const response = await axios.put("/api/user", user);
    console.log(response);
    if ([200, 202].includes(response.status)) {
      toggleEditMode();
      Swal.fire({
        title: "Account edit successful",
        icon: "success",
        timer: 2000,
        timerProgressBar: true,
        text: `You have successfully updated your account.`,
        showCancelButton: false,
        confirmButtonText: "Alright",
      }).then(() => {
        location.reload();
      });
    } // You can reset this back to response.status == 200 if you want to handle that differently. 202 means nothing was updated, 200 means something was updated.
  } catch (e) {
    errorText = e.response.data;
    const updateError = document.getElementById(errorT);
    updateError.innerHTML = `${exclamationCircle} ${errorText}`;
    console.error(e.response);
  }
};
const editPassForm = document.getElementById("change-password-form");
const loginForm = document.querySelector("#login");
const registerForm = document.querySelector("#register");
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
    switchButton.innerHTML =
      switchButton.innerHTML == "Sign-In" ? "Register now!" : "Sign-In";
    switchPrompt.innerHTML =
      switchButton.innerHTML == "Sign-In"
        ? "Already have an account?"
        : "Don't have an account?";
    authHeader.innerHTML =
      switchButton.innerHTML == "Sign-In"
        ? "<i class='fa fa-lock'></i> Secure Sign-Up"
        : "<i class='fa fa-lock'></i> Secure Sign-In";
  });
};

const toggleEditMode = async () => {
  const     labels = [...document.querySelectorAll("#accountCard label")],
            inputs = [...document.querySelectorAll("#accountCard input")],
        breaklines = [...document.querySelectorAll("#accountCard br")],
       resetButton = document.querySelector("#accountCard button[type='reset']"),
     confirmButton = document.querySelector("#accountCard #multiButton"),
    errorParagraph = document.querySelector("#update-error");
  if (confirmButton.getAttribute("type") == "button") {
    resetButton.innerText = "Discard Changes";
    resetButton.style = "color: red;";
    confirmButton.innerText = "Submit Changes";
    confirmButton.type = "submit";
    confirmButton.removeAttribute("onclick");
    labels.forEach((label) => {
      label.classList.remove("invisible");
    });
    inputs.forEach((label) => {
      label.classList.remove("invisible");
    });
    breaklines.forEach((br) => {
      br.classList.remove("invisible");
    });
    document.querySelectorAll(".user-details").forEach((ud) => {
      ud.classList.add("invisible");
    });
  } else {
    resetButton.innerHTML = '<i class="fas fa-pencil-alt"></i> Change';
    resetButton.style = "";
    confirmButton.innerHTML = '<i class="fas fa-sign-out-alt"></i> Sign Out';
    confirmButton.type = "button";
    confirmButton.setAttribute("onclick", "logOut()");
    errorParagraph.innerText = "";
    labels.forEach((label) => {
      label.classList.add("invisible");
    });
    inputs.forEach((label) => {
      label.classList.add("invisible");
    });
    breaklines.forEach((br) => {
      br.classList.add("invisible");
    });
    document.querySelectorAll(".user-details").forEach((ud) => {
      ud.classList.remove("invisible");
    });
  }
};
const editPassword = () => {
  Swal.fire({
    title: "Change Password",
    html: '<input type="password" class="swal2-input" placeholder="Current Password" required id="changepass-current"><br>\
        <input type="password" class="swal2-input" placeholder="New Password" required id="changepass-new"><br>\
        <input type="password" class="swal2-input" placeholder="Confirm New Password" required id="changepass-confirm"><br>',
    inputAttributes: {
      autocapitalize: "off",
    },
    showCancelButton: true,
    confirmButtonText: "Change Password",
    allowOutsideClick: () => !Swal.isLoading(),
    preConfirm: async () => {
      const oldPass = Swal.getPopup().querySelector(
        "#changepass-current"
      ).value;
      const newPass = Swal.getPopup().querySelector("#changepass-new").value;
      const newPassConfirm = Swal.getPopup().querySelector(
        "#changepass-confirm"
      ).value;
      if (!oldPass || !newPass || !newPassConfirm) {
        Swal.showValidationMessage(`Please fill all input fields.`);
      } else {
        try {
          const response = await axios.put("/api/user", {
            name: null,
            email: null,
            password: oldPass,
            passwordNew: newPass,
            passwordConfirm: newPassConfirm,
          });
          console.log(response);
          if ([200, 202].includes(response.status)) {
            return {
              password: oldPass,
              new_password: newPass,
              new_password_confirm: newPassConfirm,
            };
          }
        } catch (e) {
          Swal.showValidationMessage(e.response.data);
        }
      }
    },
  }).then((result) => {
    if (result.isConfirmed) {
      Swal.fire({
        title: "Successfully changed password",
        icon: "success",
        timer: 2000,
        timerProgressBar: true,
      });
    }
  });
};
const deleteAccount = () => {
  Swal.fire({
    title: "Delete Account",
    icon: "warning",
    html: "<p>By deleting your account all your services will be stopped immediately without refundation.<br><br>You will be signed out immediately,\
        your account will be locked and it will enter a redemption period for 7 days.<br><br>You can message us at support@ametrine.host or open\
        a ticket on our Discord server to retrieve your account. <br><br>After 7 days, all your data will be deleted from all our databases.</p>",
    input: "checkbox",
    inputPlaceholder: "I understand the consequences of deleting my account.",
    inputAttributes: {
      autocapitalize: "off",
    },
    showCancelButton: true,
    confirmButtonText: "Continue",
    allowOutsideClick: () => !Swal.isLoading(),
    preConfirm: async (checkbox) => {
      if (!checkbox)
        return Swal.showValidationMessage(
          "You must agree to have read this disclaimer before continuing."
        );
    },
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
          if (!password)
            return Swal.showValidationMessage(
              "You must write your password into the input."
            );
        },
      });
    }
  });
};

axios.post("/api/auth/discord", {
  code: params.code
}).then(res => {
  if(!res) return;
  location.reload();
});

window.onload = () => {

  if(!document.body.classList.contains("loggedIn") && (window.location.pathname == "/billing" || window.location.pathname == "/billing/")) document.querySelector("#authentication").classList.add("shown");
  switcher();
  loginForm.addEventListener("submit", (event) => {
    event.preventDefault();
    const email = loginForm.querySelector("fieldset #login-email").value;
    const password = loginForm.querySelector("fieldset #login-password").value;
    const remember = loginForm.querySelector(
      "fieldset #login-rememberSession"
    ).checked;
    loginUser({
      email,
      password,
      rememberMe: remember,
    });
  });
  registerForm.addEventListener("submit", (event) => {
    event.preventDefault();
    const name = registerForm.querySelector("fieldset #register-name").value;
    const email = registerForm.querySelector("fieldset #register-email").value;
    const password = registerForm.querySelector(
      "fieldset #register-password"
    ).value;
    const passwordConfirm = registerForm.querySelector(
      "fieldset #register-password-confirm"
    ).value;
    registerUser({
      name,
      email,
      password,
      passwordConfirm,
      "g-recaptcha-response": grecaptcha.getResponse(),
    });
  });
  try {
    updateForm.addEventListener("submit", async (event) => {
      event.preventDefault();
      const name = updateForm.querySelector("#account-fullName").value;
      const email = updateForm.querySelector("#account-email").value;
      const password = updateForm.querySelector(
        "#account-confirm-password"
      ).value;
      //const passwordCheck = axios.post(`/api/auth/verifyPassword`)(password, )
      updateUser(
        {
          name,
          email,
          password,
        },
        "update-error"
      );
    });
  } catch (e) {
    e;
  }
  try {
    prepareOrderButtons();
  } catch (e) {
    e;
  }
};