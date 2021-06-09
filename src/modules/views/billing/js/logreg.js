const toggleLoginDialog = () => {
    document.getElementById("forms").classList.toggle("forms-activated");
};
let bool = false;
function toggleRegisterDialog(){
    if(!bool){
        bool = true;
        document.getElementById("login").setAttribute("disabled", true);
        document.getElementById("register").removeAttribute("disabled");
        document.getElementById("form-header").innerHTML  ="<i class=\"fa fa-lock\"></i> Secure Registration";
        document.getElementById("forgot-pass").style = "visibility:hidden;";
        document.getElementById("no-acc-text").innerHTML = "Already have an account?";
        document.getElementById("register-button").innerHTML = "Login now";
    }else{
        bool = false;
        document.getElementById("register").setAttribute("disabled", true);
        document.getElementById("login").removeAttribute("disabled");
        document.getElementById("form-header").innerHTML  ="<i class=\"fa fa-lock\"></i> Secure Login";
        document.getElementById("forgot-pass").style = "visibility:initial;";
        document.getElementById("register-button").innerHTML = "Register now";
    }
}

document.getElementById("login-button").addEventListener("click", toggleLoginDialog);
document.getElementById("register-button").addEventListener("click", toggleRegisterDialog);