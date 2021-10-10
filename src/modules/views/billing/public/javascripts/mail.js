const mailForm = document.getElementById("mailCreate");
const subject = document.getElementById("subject"),
    email = document.getElementById("email"),
    errorText = document.getElementById("errorText"),
    successText = document.getElementById("successText");
mailForm.addEventListener("submit", async(event) => {
    event.preventDefault();
    try{
    const response = await axios.post("/api/mail", {
        subject: subject.value,
        email: email.value,
        content: editor.getContents()
    })
    console.log(response);
    email.value = "";
    subject.value = "";
    editor.setContents("", "api")
    successText.innerText = "Email sent successfully! You will now be redirected to the main page.";
    setTimeout(() => {
        window.location = "/billing/";
    }, 2000)
    }catch(e){
        switch(e.toString()){
            case "Error: Request failed with status code 403": errorText.innerText = "You are not allowed to send mail."; break;
            case "Error: Request failed with status code 405": errorText.innerText = "E-Mail you have provided is invalid."; break;
            case "Error: Request failed with status code 406": errorText.innerText = "Please enter in an Email, Subject, and Content"; break;
            case "Error: Request failed with status code 500": errorText.innerText = "There was an error on our side. Please try again later."; break;
        }
    }
});