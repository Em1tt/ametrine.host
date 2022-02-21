const toggle = async (id) => {
    document.getElementById(id).classList.toggle("shown");
    document.querySelectorAll(".shown").forEach(item => {
        if(item.id == id) return;
        item.classList.toggle("shown");
    })
}
const announcementsToggle = async () => {
    document.getElementById("announcements").classList.toggle("showAnnouncements");
}

document.getElementById("support")?.addEventListener("click", () => {toggle("supportPopup")});
document.getElementById("announcementButton")?.addEventListener("click", announcementsToggle);
!document.querySelector(".loggedIn#login-button") ? document.getElementById("login-button")?.addEventListener("click", () => {toggle("authentication")}) : 0;
document.getElementById("closeAnnouncements")?.addEventListener("click", announcementsToggle);