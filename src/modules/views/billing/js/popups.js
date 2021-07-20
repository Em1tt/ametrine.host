const turnOffDialogs = (ignoreThis) => {
    [].forEach.call(document.querySelectorAll(".popup-activated"), function(item){
        if(item.classList.contains(ignoreThis)) return;
        item.classList.remove("popup-activated");
    });
}

const toggleSupportDialog = () => {
    turnOffDialogs("supportPopup");
    document.getElementById("supportPopup").classList.toggle("popup-activated");
};

document.querySelector("#support").addEventListener("click", toggleSupportDialog);

const toggleOrderDialog = () => {
    turnOffDialogs("orderPopup");
    document.getElementById("orderPopup").classList.toggle("popup-activated");
};

document.querySelector("#order").addEventListener("click", toggleOrderDialog);