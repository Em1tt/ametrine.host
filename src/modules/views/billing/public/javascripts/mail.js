const mailForm = document.getElementById("mailCreate");

mailForm.addEventListener("submit", async(event) => {
    event.preventDefault();
    const response = await axios.post("/api/mail")
});