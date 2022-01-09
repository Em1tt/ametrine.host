console.log("Official sound effects made by Nintendo.");
const trackMovement = function(y){
    if(y+125 > window.innerHeight){
        player.style = `top: ${window.innerHeight-225}px`
    }else if(y-125 < 0){
        player.style = `top: 25px`
    }else{
        player.style = `top: ${y-100}px`
    }
}
let gameStartFirst = false; //Don't touch
let pongs = 0; //Don't touch
let speed = 10; //Beginning speed.
let multiplier = 1; //Change this to determine difficulty over time. The higher, the sooner it becomes fast.
console.log(`Your settings: \nBeginning Speed: ${speed} (recommended: 10)\nMultiplier per pong: ${multiplier} (recommended: 1)\n\nYou can change these settings at any time on lines 60, 61`)
let speedY = Math.floor(Math.random() * speed);
let hitWall = false;
const ball = [...document.getElementsByTagName("ball")][0];
const player = [...document.getElementsByTagName("player")][0];
document.body.addEventListener("click", (e) => {
    document.body.removeChild([...document.getElementsByTagName("h2")][0]);
    if(gameStartFirst) return;
    ball.style = `top: ${parseInt(document.body.clientHeight / 2)}px; left: ${parseInt(document.body.clientWidth / 2)}px;`
    gameStartFirst = true;
    if(!e.ctrlKey){
        document.body.addEventListener('mousemove', (e) => trackMovement(e.clientY))
    }else{
        let h2 = document.createElement("h2");
        document.body.appendChild(h2);
        h2.innerText="AI mode";
    }
    setInterval(() => {
        if(!gameStartFirst) return;
        let curY = parseInt(ball.style.top);
        let curX = parseInt(ball.style.left);
        if(e.ctrlKey){
            trackMovement(curY+25);
        }
        if(curX - speed < 25){
            curX = 26;
            speed = -(speed);
            if(Math.abs(speed) < 800){
              new Audio("/sounds/pong.mp3").play();
              }
        }else if(curX - speed > document.body.clientWidth - 75 && curY < parseInt(player.style.top)+200 && curY > parseInt(player.style.top)-40 && curX > 0){
            curX = document.body.clientWidth - 76;
            speed = -(speed-multiplier);
            speedY = Math.floor(Math.random() * speed);
            pongs++;
            new Audio("/sounds/player.mp3").play();
            [...document.getElementsByTagName("h1")][0].innerText = `Pongs: ${pongs} | Speed: ${Math.abs(speed+multiplier)}`
        }
        if(curY - speedY < 25){
            speedY = -(speedY);
            curY = 26;
            if(Math.abs(speed) < 400){
            new Audio("/sounds/pong.mp3").play();
            }
        }else if(curY - speedY > document.body.clientHeight - 25){
            speedY = -speedY;
            curY = document.body.clientHeight - 26;
            if(Math.abs(speed) < 400){
            new Audio("/sounds/pong.mp3").play();
            }
          }
        if(curX > document.body.clientWidth){
            window.localStorage.setItem("best", pongs);
            speed, speedY, multiplier = 0;
                document.body.style = "background: #200000";
            setTimeout(() => {
                document.body.style = "background: black";
            }, 100);
            new Audio("/sounds/death.mp3").play();
            gameStartFirst = false;
            setTimeout(() => {
                location.reload();
            }, 1500);

        }
        if(speed > 700){
          let pnf = document.getElementById("pnf");
          let error = document.getElementById("404");
          pnf.innerText = "ERROR!";
          let erCodes = ["404", "502", "200", "202", "406", "403"];
          error.innerText = erCodes[Math.floor(Math.random() * erCodes.length)];
          document.body.style = "border: 25px solid red;border-right: none;";
          player.style = "background: red !important;";
        }
        ball.style = `left: ${curX-speed}px;top: ${curY-speedY}px;`;
    }, 16.6666667);
})