const buttons = document.getElementsByClassName("buttons"),
      editButtons = document.getElementsByClassName("editButtons"),
      priority = document.getElementById("priority"),
      category = document.getElementById("category"),
      subjectWrapper = document.getElementById("subjectWrapper"),
      subject = document.getElementById("subject"),
      closedOn = document.getElementById("closedOn");
const ticketID = document.getElementById("ticketID").innerHTML;
async function saveEdits(){
    try{
    const response = await axios.put(`/api/tickets/${ticketID}`, {
        subject: subject.value,
        content: editor.getContents(),
        categories: [category.value],
        priority: priority.value,
        reopen: closedOn?.innerHTML == undefined ? 0 : 1
    });
    location.reload()
    console.log(response);
    }catch(e){
        console.log(e);
    }
}
function dateFormatter(data) {
  let date = new Date(data).toDateString().split(" ");
  if (data == 0 || typeof data == undefined || data == null) {
    let date = "never";
    return "never";
  } else {
    if (date[2].startsWith(0)) {
      date[2] = date[2].slice(1);
    }
    if (date[2].endsWith(1)) {
      date[2] = date[2] + "st";
    } else if (date[2].endsWith(2)) {
      date[2] = date[2] + "nd";
    } else if (date[2].endsWith(3)) {
      date[2] = date[2] + "rd";
    } else {
      date[2] = date[2] + "th";
    }
    date = [date[2], date[1], date[3]].join(" ");
    return date;
  }
}
async function ticketClose(){
    try{
        const response = await axios.put(`/api/tickets/${ticketID}`, {
            closed: 1
        });
        location.reload()
        console.log(response);
        }catch(e){
            console.log(e);
        }
}
async function ticketOpen(){
    try{
        const response = await axios.put(`/api/tickets/${ticketID}`, {
            reopen: 1
        });
        location.reload()
        console.log(response);
        }catch(e){
            console.log(e);
        }
}

async function sendMessage(){
    try{
        const response = await axios.post(`/api/tickets/${ticketID}`, {
            content: editor.getContents()
        });
        location.reload();
        console.log(response);
        }catch(e){
            console.log(e);
        }
}

(async () => {
    let messageWrapper = document.getElementById("messageWrapper");
    let actualWrapper = document.getElementById("actualMessageWrapper");
    const urlParams = new URLSearchParams(window.location.search);
    let page = urlParams.get("page");
    if(!page || page == undefined || page == null) page = 1;
    try{
        const response = await axios.get(`/api/tickets/${ticketID}?page=${page}`);
        console.log(response);
        const ticket = response.data;
        const leftButtons = [...document.getElementsByClassName("pageLeft")],
        rightButtons = [...document.getElementsByClassName("pageRight")];
  console.log(window.location);
  leftButtons.forEach(button => {
      button.addEventListener("click", () => {
          window.location = `${window.location.pathname}?page=${parseInt(page)-1}`
      });
  });
  rightButtons.forEach(button => {
      button.addEventListener("click", () => {
          window.location = `${window.location.pathname}?page=${parseInt(page)+1}`
      });
  })
        if(!ticket.msgs || !ticket.msgs.length){
            let h2 = document.createElement("h2")
            h2.innerText = "No messages yet."
            h2.classList.add("noMessages");
            messageWrapper.insertBefore(h2, [...messageWrapper.children][1]);
            document.getElementById("bottomButtons").classList.add("hidden");
            if(page != 1 && page > 0){
                leftButtons.forEach(button => {
                    button.removeAttribute("disabled");
                })
            }
        }else{
                
            if(page == 1 && ticket.msgs.length == 10){
                rightButtons.forEach(button => {
                    button.removeAttribute("disabled");
                })
            }else if(page != 1 && page > 0 && ticket.msgs.length == 10){
                rightButtons.forEach(button => {
                    button.removeAttribute("disabled");
                })
                leftButtons.forEach(button => {
                    button.removeAttribute("disabled");
                })
            }else if(page != 1 && page > 0 && ticket.msgs.length < 10){
                leftButtons.forEach(button => {
                    button.removeAttribute("disabled");
                })
            }
            ticket.msgs.forEach(async msg => {
                let title = document.createElement("span")
                title.classList.add("title");
                let img = document.createElement("img")
                img.src = "/billing/public/images/User.svg";
                img.height = 50;
                img.width = 50;
                img.alt = "User";
                let div = document.createElement("div");
                let clientName, role;
                if(msg.user_id == ticket.user_id){
                    img.classList.add("user");
                    clientName = document.createElement("p");
                    clientName.innerText = ticket.name;
                    role = document.createElement("p");
                    role.innerText = "Customer";
                    role.classList.add("role");
                }else{
                    img.classList.add("staff");
                    clientName = document.createElement("p");
                    clientName.innerText = ticket.name;
                    role = document.createElement("p");
                    role.innerText = "Customer";
                    role.classList.add("role");
                }
                actualWrapper.appendChild(title);
                title.appendChild(img);
                title.appendChild(div);
                div.appendChild(clientName);
                div.appendChild(role);
                const spanContent = document.createElement("span");
                const dateCreated = document.createElement("p");
                dateCreated.innerText = dateFormatter(msg.createdIn);
                dateCreated.classList.add("dateCreated");
                title.appendChild(dateCreated);
                let messageEditorrr = new Quill(spanContent, {
                    theme: "snow",
                    readOnly: true,
                    modules: {
                        toolbar: false
                    }
                });
                messageEditorrr.setContents(JSON.parse(msg.content), "api")
                actualWrapper.appendChild(spanContent);
                spanContent.classList.add("message");
            });
        }
        }catch(e){
            console.log(e);
        }
})()