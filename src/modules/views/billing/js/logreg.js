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
    }else{
        bool = false;
        document.getElementById("register").setAttribute("disabled", true);
        document.getElementById("login").removeAttribute("disabled");
        document.getElementById("form-header").innerHTML  ="<i class=\"fa fa-lock\"></i> Secure Login";
    }
}

document.getElementById("login-button").addEventListener("click", toggleLoginDialog);
document.getElementById("register-button").addEventListener("click", toggleRegisterDialog);