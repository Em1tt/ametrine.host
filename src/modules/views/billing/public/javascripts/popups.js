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