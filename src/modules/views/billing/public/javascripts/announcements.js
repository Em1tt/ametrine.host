window.onload = async () => {
    const announcements = document.getElementById("announcements");
    try{
        const response = await axios.get("/api/announcements");
        console.log(response);
    }catch(e){

    }

}