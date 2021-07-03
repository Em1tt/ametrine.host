const toggleSupportDialog = () => {
    document.getElementById("supportPopup").classList.toggle("support-activated");
};

document.querySelector("#support").addEventListener("click", toggleSupportDialog);