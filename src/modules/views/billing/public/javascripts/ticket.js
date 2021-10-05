const buttons = document.getElementsByClassName("buttons"),
      editButtons = document.getElementsByClassName("editButtons"),
      priority = document.getElementById("priority"),
      category = document.getElementById("category"),
      subjectWrapper = document.getElementById("subjectWrapper"),
      subject = document.getElementById("subject");
async function saveEdits(){
    console.log(subject.value);
    const ticketID = document.getElementById("ticketID").innerHTML;
    try{
    const response = await axios.put(`/api/tickets/${ticketID}`, {
        subject: subject.value,
        content: editor.getContents(),
        categories: [category.value],
        priority: priority.value,
    });
    console.log(response);
    }catch(e){
        console.log(e);
    }
}