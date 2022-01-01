const buttons = document.getElementsByClassName("buttons"),
    editButtons = document.getElementsByClassName("editButtons"),
    priority = document.getElementById("priority"),
    category = document.getElementById("category"),
    subjectWrapper = document.getElementById("subjectWrapper"),
    subject = document.getElementById("subject"),
    closedOn = document.getElementById("closedOn");
const ticketID = document.getElementById("ticketID").innerHTML;
async function saveEdits() {
    try {
        const imageManager = document.querySelector("#imageManager");
        let images = await Promise.all([...imageManager.children].map(async (div) => {
            let image = [...div.children][0];
            if(!image.src.startsWith("blob:")) return image.src;
            const blob = await (await fetch(image.src)).blob();
            if (blob) {
                return {
                    name: blob.name,
                    data: arrayBufferToBase64(await blob.arrayBuffer(), blob.type),
                    lastModified: blob.lastModified,
                    size: blob.size,
                    type: blob.type
                }
            }
        }));
        const response = await axios.put(`/api/tickets/${ticketID}`, {
            subject: subject.value,
            content: editor.getContents(),
            categories: [category.value],
            priority: priority.value,
            reopen: closedOn?.innerHTML == undefined ? 0 : 1,
            files: images
        });
        location.reload()
        console.log(response);
    } catch (e) {
        console.error(e);
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
async function ticketClose() {
    try {
        const response = await axios.put(`/api/tickets/${ticketID}`, {
            closed: 1
        });
        location.reload()
        console.log(response);
    } catch (e) {
        console.log(e);
    }
}
async function ticketOpen() {
    try {
        const response = await axios.put(`/api/tickets/${ticketID}`, {
            reopen: 1
        });
        location.reload()
        console.log(response);
    } catch (e) {
        console.log(e);
    }
}
function arrayBufferToBase64(buffer, type) {  // https://stackoverflow.com/a/9458996
    var binary = '';
    var bytes = new Uint8Array(buffer);
    var len = bytes.byteLength;
    for (var i = 0; i < len; i++) {
        binary += String.fromCharCode(bytes[i]);
    }
    const b64 = window.btoa(binary);
    return (b64.length && type) ? `data:${type};base64,${b64}` : b64;
}
async function sendMessage() {
    try {
        const imageManager = document.querySelector("#imageManager");
        let images = await Promise.all([...imageManager.children].map(async (div) => {
            let image = [...div.children][0];
            const blob = await (await fetch(image.src)).blob();
            if (blob) {
                return {
                    name: blob.name,
                    data: arrayBufferToBase64(await blob.arrayBuffer(), blob.type),
                    lastModified: blob.lastModified,
                    size: blob.size,
                    type: blob.type
                }
            }
        }));
        const response = await axios.post(`/api/tickets/${ticketID}`, {
            content: editor.getContents(),
            files: images
        });
        if (closedOn?.innerHTML != undefined) {
            await axios.put(`/api/tickets/${ticketID}`, {
                reopen: 1
            });
        }
        location.reload();
        console.log(response);
    } catch (e) {
        console.log(e);
    }
}

(async () => {
    let messageWrapper = document.getElementById("messageWrapper");
    let actualWrapper = document.getElementById("actualMessageWrapper");
    const urlParams = new URLSearchParams(window.location.search);
    let page = urlParams.get("page");
    if (!page || page == undefined || page == null) page = 1;
    const screenshots = document.querySelector("#screenshots");
    screenshots.onchange = async event => {
        const imageManager = document.querySelector("#imageManager");
        var fileList = [...screenshots.files];
        for(let i=0; i < fileList.length; i++){
            if (imageManager.children.length >= 5) {
                Swal.fire({
                    title: "You hit the screenshot limit",
                    icon: "error",
                    text: `In order to help secure our servers, we limit each ticket to 5 screenshots max.`,
                    showCancelButton: false,
                    confirmButtonText: "Understood"
                });
            } else {
                if (fileList[i].size > 8388608) {
                    function waitForSwal(){
                        return new Promise(resolve => {
                            Swal.fire({
                                title: "Screenshot too big",
                                icon: "error",
                                html: `<p>The file <code style="color:#7066e0;">${fileList[i].name}</code> hit the size limit. It will not be uploaded.</p>`,
                                showCancelButton: false,
                                confirmButtonText: "Understood",
                                preConfirm: resolve
                            })
                        });
                    }
                    await waitForSwal();
                } else {
                    let div = document.createElement("div");
                    let div2 = document.createElement("div");
                    let img = document.createElement("img");
                    let name = document.createElement("p");
                    let button = document.createElement("button");
                    button.type = "button";
                    button.innerText = "Delete Image";
                    button.addEventListener("click", (event) => {
                        [...imageManager.children][[...imageManager.children].indexOf(div)].remove();
                        console.log(imageManager.children);
                    });
                    img.src = URL.createObjectURL(fileList[i]);
                    img.classList.add("ticketImage");
                    name.innerText = fileList[i].name;
                    Intense(img);
                    div.appendChild(img);
                    div2.appendChild(name);
                    div2.appendChild(button);
                    div.appendChild(div2);
                    imageManager.appendChild(div);
                }
            }
        };
    }
    try {
        const response = await axios.get(`/api/tickets/${ticketID}?page=${page}`);
        console.log(response);
        const ticket = response.data;
        const leftButtons = [...document.getElementsByClassName("pageLeft")],
            rightButtons = [...document.getElementsByClassName("pageRight")];
        console.log(window.location);
        leftButtons.forEach(button => {
            button.addEventListener("click", () => {
                window.location = `${window.location.pathname}?page=${parseInt(page) - 1}`
            });
        });
        rightButtons.forEach(button => {
            button.addEventListener("click", () => {
                window.location = `${window.location.pathname}?page=${parseInt(page) + 1}`
            });
        })
        ticket.files = JSON.parse(ticket.files);
        if(ticket.files.length){
            ticket.files.forEach((file) => {
                let div = document.createElement("div");
                    let img = document.createElement("img");
                    img.src = file;
                    img.classList.add("ticketImage");
                    Intense(img);
                    div.appendChild(img);
                    document.getElementById("imageManagerInitial").appendChild(div);
            })
        }
        if (!ticket.msgs || !ticket.msgs.length) {
            let h2 = document.createElement("h2")
            h2.innerText = "No messages yet."
            h2.classList.add("noMessages");
            messageWrapper.insertBefore(h2, [...messageWrapper.children][1]);
            document.getElementById("bottomButtons").classList.add("hidden");
            if (page != 1 && page > 0) {
                leftButtons.forEach(button => {
                    button.removeAttribute("disabled");
                })
            }
        } else {

            if (page == 1 && ticket.msgs.length == 10) {
                rightButtons.forEach(button => {
                    button.removeAttribute("disabled");
                })
            } else if (page != 1 && page > 0 && ticket.msgs.length == 10) {
                rightButtons.forEach(button => {
                    button.removeAttribute("disabled");
                })
                leftButtons.forEach(button => {
                    button.removeAttribute("disabled");
                })
            } else if (page != 1 && page > 0 && ticket.msgs.length < 10) {
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
                if (msg.user_id == ticket.user_id) {
                    img.classList.add("user");
                    clientName = document.createElement("p");
                    clientName.innerText = ticket.name;
                    role = document.createElement("p");
                    role.innerText = "Customer";
                    role.classList.add("role");
                } else {
                    img.classList.add("staff");
                    clientName = document.createElement("p");
                    clientName.innerText = ticket.name;
                    role = document.createElement("p");
                    role.innerText = "Staff Member";
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
                let imageManager = document.createElement("div");
                JSON.parse(msg.files).forEach((file) => {
                    let div = document.createElement("div");
                    let img = document.createElement("img");
                    img.src = file;
                    img.classList.add("ticketImage");
                    Intense(img);
                    div.appendChild(img);
                    imageManager.appendChild(div);
                    imageManager.classList.add("imageManager");
                    actualWrapper.appendChild(imageManager);
                })
                spanContent.classList.add("message");
            });
        }
    } catch (e) {
        console.log(e);
    }
})()