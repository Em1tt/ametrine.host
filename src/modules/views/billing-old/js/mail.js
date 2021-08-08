function onLoadMail() {
    const mailerForm = document.querySelector("#mailer");
    mailerForm.addEventListener('submit', async event => {
        const url = "/api/mail"
        event.preventDefault();
        const email = mailerForm.querySelector('#mailEmail').value
        const subject = mailerForm.querySelector('#mailSubject').value;
        const content = mailerForm.querySelector('#mailText').value;
        const mailError = document.querySelector("#mailError");
        try {
            const response = await axios.post(url, { email, subject, content })
            console.log(response);
            // Add some sort of success text here, or use location.reload() if you want it to reload.
        } catch (e) {
            let errorText = "Unknown Error (Look in Console for more details)";
            switch (e.toString()) {
                case "Error: Request failed with status code 405":
                    errorText = "Invalid Email."; // Could also be due to being the wrong method, though email being incorrect should most likely be the case.
                    break;
                case "Error: Request failed with status code 403":
                    errorText = "Invalid Permissions or not logged in. Please try again later."; // Only happens if user isn't a client.
                    break;
            }
            mailError.innerHTML = `<i class='fa fa-exclamation-circle'></i> ${errorText}`;
            console.error(e);
            console.log(errorText)
        }
    });
}
