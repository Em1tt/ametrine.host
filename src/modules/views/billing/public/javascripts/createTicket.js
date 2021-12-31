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
                    img.setAttribute("blob", JSON.stringify(fileList[i]));
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
    ticketForm.addEventListener("submit", async (event) => {
        event.preventDefault();
        deltaFormat = editor.getContents(); // Bug fix, this updates deltaFormat, because without it, it'll just show { insert: '\n' } in ops
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
        const response = await axios.post("/api/tickets/create", {
            subject: subject.value,
            content: deltaFormat,
            categories: category.options[category.selectedIndex].value,
            service: null, //for now
            priority: priority.options[priority.selectedIndex].value,
            files: images
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