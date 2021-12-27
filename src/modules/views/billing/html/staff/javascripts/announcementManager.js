async function createAnnouncement(text, type, end, customersOnly, staffOnly, broadcast){
    const errorText = document.getElementById("announcementError");
    const exclamation = `<i class="fa fa-exclamation-circle"></i>`
    console.log(text,type,end,customersOnly,staffOnly,broadcast);
    if(!text || text == " "){
        errorText.innerHTML = `${exclamation} You're missing an announcement text.`;
    }
    if(!type || type == " " || type == "undefined"){
        errorText.innerHTML = `${exclamation} Please select an announcement type.`;
    }
    if(!end || end == " " || typeof end == "undefined"){
        errorText.innerHTML = `${exclamation} Please select an announcement deletion date.`;
    }
    console.log(end);
    await axios.post("/api/announcements",{
        text: text,
        type: type,
        deleteOn: end,
        showToCustomersOnly: `${customersOnly.toString()}`
    }).then(response => {
        location.reload();
    }).catch(error => {
        console.log(error.response.data);
        errorText.innerHTML = `${exclamation} ${error.response.data}`;
    })
}

async function loadAnnouncements() {
    const announcements = document.getElementById("announcementsWrapper");
    await axios.get("/api/announcements", {
        params: {
            hasPermission: "<%=it.userData.permission_id%>",
        },
    }).then(response => {
        console.log(response);
        if (response.data.length > 0) {
            response.data.forEach((announcement) => {
                const wrapper = document.createElement('div');
                wrapper.classList.add(announcement.announcementType);
                const announcementText = document.createElement('p');
                announcementText.innerText = `${announcement.announcementText}`;
                wrapper.appendChild(announcementText);
                const announcementDate = document.createElement('p');
                announcementDate.style = "font-weight: bold;";
                announcementDate.innerText = `Automatic delete on: ${dayjs(parseInt(announcement.deleteIn)).toString().split(" ").slice(0, 4).join(" ")}`;
                const announcementDeleteButton = document.createElement('button');
                announcementDeleteButton.style = "font-weight: bold; color: blue; cursor: pointer; background: transparent; border: none; padding: 0; margin-bottom: 10px;";
                announcementDeleteButton.innerText = "Delete Announcement";
                //announcementDeleteButton.onclick = deleteAnnouncement(announcement.id);
                wrapper.appendChild(announcementDate);
                wrapper.appendChild(announcementDeleteButton);
                announcements.appendChild(wrapper);
            });
        } else {
            const wrapper = document.createElement('div');
            const announcementText = document.createElement('p');
            announcementText.innerText = "No announcements yet!";
            wrapper.appendChild(announcementText);
            announcements.appendChild(wrapper);
        }
    }).catch(error => {
        const wrapper = document.createElement('div');
        const announcementText = document.createElement('p');
        announcementText.innerText = "No announcements yet!";
        wrapper.appendChild(announcementText);
        announcements.appendChild(wrapper);
        error;
    });
}
document.body.onload = loadAnnouncements();
const announcementForm = document.getElementById("announcementCreator");
announcementForm.addEventListener("submit", (event) => {
    event.preventDefault();
    
    const announcementText = document.getElementById("announcementText").value;
    const announcementEnd = dayjs(document.getElementById("announcementEnd").value).valueOf();
    const customersOnly = document.getElementById("customersOnly").checked;
    const broadcast = document.getElementById("broadcast").checked;
    const staffOnly = document.getElementById("staffAnnouncement").checked;
    let announcementType = document.getElementById("announcementType");
    announcementType = announcementType.options[announcementType.selectedIndex].value;

    createAnnouncement(announcementText, announcementType, announcementEnd, customersOnly, staffOnly, broadcast);
});