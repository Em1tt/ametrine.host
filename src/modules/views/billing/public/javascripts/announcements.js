(async () => {
    console.log("h");
    const announcements = document.getElementById("announcementsWrapper");
    try{
        console.log("b");
        const response = await axios.get("/api/announcements");
        console.log(response);
        
        response.data.forEach((announcement) => {
            const wrapper = document.createElement('div');
            wrapper.classList.add(announcement.announcementType);
            const announcementText = document.createElement('p');
            announcementText.innerText = announcement.announcementText;
            wrapper.appendChild(announcementText);
            announcements.appendChild(wrapper);
        });
    }catch(e){
        console.log(e);
    }
})()