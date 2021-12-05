(async () => {
    const exclamationCircle = `<i class="fa fa-exclamation-circle"></i>`
    const subject = document.querySelector("#subject");
    const category = document.querySelector("#category");
    const service = document.querySelector("#service");
    const priority = document.querySelector("#priority");
    const screenshots = document.querySelector("#screenshots");
    const screenshotsStatus = document.querySelector("#screenshotsStatus");
    let deltaFormat = editor.getContents(); //Rich text in a JSON format
    const ticketForm = document.querySelector("#ticketCreate");
    const errorP = document.querySelector("#errorText");

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
        deltaFormat = editor.getContents(); // Bug fix, this updates deltaFormat, because without it, it'll just show { insert: '\n' } in ops
        try {
        const response = await axios.post("/api/tickets/create", {
            subject: subject.value,
            content: deltaFormat,
            categories: category.options[category.selectedIndex].value,
            service: null, //for now
            priority: priority.options[priority.selectedIndex].value
        });
        console.log(response);
        window.location.href = `/billing/tickets/${response.data.ticket_id}`;
        } catch(e) {
            errorText = e.response.data;
            console.error(e);
            errorP.innerHTML = `${exclamationCircle} ${errorText}`;
        }
    });

})();