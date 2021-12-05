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
        errorText = e.response.data;
        console.error(e);
        errorText.innerText = errorText;
    }
});