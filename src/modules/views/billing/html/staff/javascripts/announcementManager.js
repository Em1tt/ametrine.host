async function createAnnouncement(text, type, end, customersOnly, staffOnly, broadcast){
    const errorText = document.getElementById("announcementError");
    const exclamation = `<i class="fa fa-exclamation-circle"></i>`
    if(!text || text == " "){
        errorText.innerHTML = `${exclamation} You're missing an announcement text.`;
    }
    if(!type || type == " " || type == "undefined"){
        errorText.innerHTML = `${exclamation} Please select an announcement type.`;
    }
    if(!end || end == " " || typeof end == "undefined"){
        errorText.innerHTML = `${exclamation} Please select an announcement deletion date.`;
    }
    await axios.post("/api/announcements",{
        text: text,
        type: type,
        deleteOn: end,
        showToCustomersOnly: `${customersOnly.toString()}`
    }).then(response => {
        console.log(response);
        location.reload();
    }).catch(error => {
        console.log(error.response.data);
        errorText.innerHTML = `${exclamation} ${error.response.data}`;
    })
}

async function removeAnnouncement(id){
    console.log("hi", id);
    await axios.delete("/api/announcements",{
        data: {
            id: id
        }
    }).then(response => {
        location.reload();
    }).catch(error => {
        console.log(error.response.data);
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
                announcementDeleteButton.style = "font-weight: bold; color: #ff4141; cursor: pointer; background: transparent; text-shadow: 0 0 5px rgba(0,0,0,1); padding: 0px; border: none; margin-bottom: 10px;";
                announcementDeleteButton.innerText = "Delete Announcement";
                announcementDeleteButton.addEventListener("click", () => {
                    removeAnnouncement(announcement.announcement_id);
                });
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
    const staffOnly = document.getElementById("staffAnnouncement")?.checked;
    let announcementType = document.getElementById("announcementType");
    announcementType = announcementType.options[announcementType.selectedIndex].value;
    createAnnouncement(announcementText, announcementType, announcementEnd, customersOnly, staffOnly, broadcast);
});
let date = new Date();
date.setDate(date.getDate() + 1);
date = date.toISOString().split("T")[0];
document.querySelector("#announcementEnd").setAttribute("min", date)