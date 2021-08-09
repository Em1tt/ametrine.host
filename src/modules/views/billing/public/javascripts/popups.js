const toggle = async (id) => {
    
    document.getElementById(id).classList.toggle("hidden");
}
const announcementsToggle = async () => {
    document.getElementById("announcements").classList.toggle("showAnnouncements");
}