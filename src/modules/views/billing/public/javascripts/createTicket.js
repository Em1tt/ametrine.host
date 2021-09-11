(async () => {
    const exclamationCircle = `<i class="fa fa-exclamation-circle"></i>`
    const subject = document.querySelector("#subject");
    const category = document.querySelector("#category");
    const service = document.querySelector("#service");
    const priority = document.querySelector("#priority");
    const screenshots = document.querySelector("#screenshots");
    const screenshotsStatus = document.querySelector("#screenshotsStatus");
    const deltaFormat = editor.getContents(); //Rich text in a JSON format
    const ticketForm = document.querySelector("#ticketCreate");
    const errorText = document.querySelector("#errorText");

    screenshots.onchange = function(event) {
        var fileList = [...screenshots.files];
        if(fileList.length > 5){
            fileList = fileList.slice(0, 5);
        }
        screenshotsStatus.innerText = "";
        console.log(fileList);

        screenshotsStatus.innerText = fileList.map(f => `${f.name}`).join(", ");
    }

    ticketForm.addEventListener("submit", async (event) => {
        event.preventDefault();
        try{
        const response = await axios.post("/api/tickets/create", {
            subject: subject.value,
            content: deltaFormat,
            categories: category.options[category.selectedIndex].value,
            service: null, //for now
            priority: priority.options[priority.selectedIndex].value
        });
        console.log(response);
        window.location.href = `/billing/tickets/${response.data.ticket_id}`;
    }catch(e){
        let errorText = "Unknown Error (Look in Console for more details)";
        switch(e.toString()){
            case "Error: Request failed with status code 403":
                errorText = "Subject or content is too long. Content is max. 2000 characters."
                break;
        }
        errorText.innerHTML = `${exclamationCircle} ${errorText}`;
        console.error(e);
    }
    });

})();