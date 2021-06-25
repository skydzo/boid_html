const canvas = document.querySelector('canvas');
const c = canvas.getContext('2d');
const navbarSize = 0;//61.1

canvas.width = innerWidth;
canvas.height = innerHeight - navbarSize;

const scrollHeight = canvas.height - 200;

c.fillStyle = "red";

class Boid {
    constructor(x,y,xDir,yDir,size){
        // Position
        this.x = x;
        this.y = y;

        this.xPred = x;
        this.yPred = y;

        // Direction
        this.xDir = xDir;
        this.yDir = yDir;

        this.neighbors = [];
        
        this.color = [0,0,0];

        this.isInZone = false;
        this.size = size;
        this.changeColor = false;
        this.zoomColor = [0,0,0]
    }

    draw(){

        if(this.changeColor == false && this.size < 50){
            c.beginPath();
            c.arc(this.x-1.5,this.y+1.5,this.size+this.size*0.4,0,Math.PI*2,false);
            c.fillStyle = "rgba(0,0,0,0.025)";
            c.fill();
        }


        c.beginPath();
        c.arc(this.x,this.y,this.size,0,Math.PI*2,false);
        //if(this.isInZone == false){
            if(this.changeColor == true){
                this.color = this.zoomColor;
                c.fillStyle = "rgba("+this.color[0]+"," +this.color[1]+","+this.color[2]+", 0.5)";
                //c.strokeStyle = "rgba("+this.color[0]+"," +this.color[1]+","+this.color[2]+", 0.5)";

            }else{
                this.color = [this.scaleValue(this.xDir*10,[-10,10],[255,255]),this.scaleValue(this.yDir*10,[-10,10],[50,150]),0]
                c.fillStyle = "rgba("+this.color[0]+"," +this.color[1]+","+this.color[2]+", 0.5)";
                //c.strokeStyle = "rgba("+this.color[0]+"," +this.color[1]+","+this.color[2]+", 0.5)";

            }
        /*}else{
            this.color = [this.scaleValue(this.xDir*10,[-10,10],[255,255]),this.scaleValue(this.yDir*10,[-10,10],[50,150]),0]
            c.fillStyle = "rgba("+this.color[0]+"," +this.color[1]+","+this.color[2]+", 0.5)";        
        }*/

        c.fill();

    }

    scaleValue(value, from, to) {
        var scale = (to[1] - to[0]) / (from[1] - from[0]);
        var capped = Math.min(from[1], Math.max(from[0], value)) - from[0];
        return ~~(capped * scale + to[0]);
    }
}

class BoidController{
    constructor(boidNumber,boidsSize,visionRange,separation,mouseDodgeDistance,speedlimit){
        this.boidNumber = boidNumber;

        this.visionRange = visionRange;
        this.separation = separation;
        this.mouseDodgeDistance = mouseDodgeDistance;

        this.followMouseFact = 1; // 0.05
        this.dodgeFromMouseFact = 1; // 0.8
        this.separationFact =  1; // 2
        this.aligmentFact = 0.8; // 100
        this.cohesionFact = 0.01; // 0.005
        this.feedFact = 5; //50  0.05
        this.moveFromMiddleFact = 1;

        this.dodgeBoundsValue = 0.5; // 0.5
        this.speedlimit = speedlimit; // 5

        this.boids = [];

        this.mousePosition_X = 0;
        this.mousePosition_Y = 0;

        this.feedPosition_X = 0;
        this.feedPosition_Y = 0;

        this.haveFeedOnScreen = false;
        this.boidsSize = boidsSize;

        this.isRunning = true;
    }

    init(){
        for(let i=0;i<this.boidNumber;i++){
            this.boids.push(new Boid(this.randomNumber(0,canvas.width),this.randomNumber(0,canvas.height),this.randomNumber(-1,1),this.randomNumber(-1,1),this.boidsSize));
        }
    }

    draw(){
        setInterval(()=>{
            if(this.isRunning){
                c.clearRect(0, 0, canvas.width, canvas.height);

                if(this.haveFeedOnScreen){
                   c.beginPath();
                   c.arc(this.feedPosition_X,this.feedPosition_Y,15,0,Math.PI*2,false);
                   c.fillStyle = "rgba(255,255,255,1)";
                   c.fill();
                }
   
               for(let i=0;i<this.boids.length;i++){
                   var newDirection = this.calculateNewPosition(this.boids[i],this.boids[i].xDir,this.boids[i].yDir);
                   var limitedDirection = this.limitSpeed(newDirection);
                   let predx = this.boids[i].x;
                   let predy = this.boids[i].y;
                   this.boids[i].x = this.boids[i].x + limitedDirection[0];
                   this.boids[i].y = this.boids[i].y + limitedDirection[1];
                   this.boids[i].draw();
                   this.initDirection(this.boids[i],predx,predy);
               }
            }
        },0)
    }

    calculateNewPosition(boid,startdirection_X,startdirection_Y){

        this.getNeighbors(boid);
        var cohesionVector = this.cohesion(boid);
        var alignementVector = this.averageAlignement(boid,startdirection_X,startdirection_Y);
        var separateVector = this.separate(boid);
        var dodgeFromMouseVector = this.dodgeFromMouse(boid);
        var goToFeedVector = [0,0];
        if(this.haveFeedOnScreen){
            goToFeedVector = this.goToFeed(boid);
        }
        var keepInBoundsVector = this.keepInBounds(boid);
        var moveFromMiddleVector = this.moveFromMiddle(boid)

        var newDirection = [cohesionVector[0]*this.cohesionFact+alignementVector[0]*this.aligmentFact+separateVector[0]*this.separationFact+dodgeFromMouseVector[0]*this.dodgeFromMouseFact+keepInBoundsVector[0]+goToFeedVector[0]*this.feedFact+moveFromMiddleVector[0]*this.moveFromMiddleFact,
                            cohesionVector[1]*this.cohesionFact+alignementVector[1]*this.aligmentFact+separateVector[1]*this.separationFact+dodgeFromMouseVector[1]*this.dodgeFromMouseFact+keepInBoundsVector[1]+goToFeedVector[1]*this.feedFact+moveFromMiddleVector[1]*this.moveFromMiddleFact];
        return newDirection
    }

    initDirection(boid,predX,predY){
            let magnitude = this.distance(predX,predY,boid.x,boid.y);
            var normalizedVector =  this.normalize(predX - boid.x, predY - boid.y)
            boid.xDir = normalizedVector[0];
            boid.yDir = normalizedVector[1];
    }


    keepInBounds(boid){
        var vector = [0,0]
        if(boid.x < 0){
        	boid.x = 0;
            vector[0] = this.dodgeBoundsValue;
        }
        if(boid.y < 0){
        	boid.y = 0;
            vector[1] = this.dodgeBoundsValue;
        }
        if(boid.x > canvas.width){
        	boid.x = canvas.width
            vector[0] = - this.dodgeBoundsValue;
        }
        if(boid.y > canvas.height){
        	boid.y = canvas.height
            vector[1] = - this.dodgeBoundsValue;
        }
        return vector;
    }

    moveFromMiddle(boid){
        var newDir = [0,0];
        var zoneSize = [500,150];
        if(canvas.width < 900){
            zoneSize = [250,75]
        }
        if((boid.x > (canvas.width / 2) - (zoneSize[0] / 2) && boid.x < (canvas.width / 2) + (zoneSize[0] / 2)) && (boid.y > (canvas.height / 2) - (zoneSize[1] / 2) && boid.y < (canvas.height / 2) + (zoneSize[1] / 2) )){
            boid.isInZone = true;
            newDir = this.normalize(boid.x - canvas.width / 2,boid.y - canvas.height / 2)
            return newDir;
        }
        boid.isInZone = false;

        return newDir;
    }

    separate(boid){
        let moveAway_X = 0;
        let moveAway_Y = 0;
        for(let i=0;i<boid.neighbors.length;i++){
            if(this.distance(boid.x,boid.y,boid.neighbors[i].x,boid.neighbors[i].y) < this.separation){
                moveAway_X = moveAway_X + (boid.x - boid.neighbors[i].x);
                moveAway_Y = moveAway_Y + (boid.y - boid.neighbors[i].y);
            }
        }
        var normalizedVector = this.normalize(moveAway_X,moveAway_Y);
        return normalizedVector;
    }

    averageAlignement(boid, startdirection_X,startdirection_Y){
        let cumulateDirections_X = 0;
        let cumulateDirections_Y = 0;
        let avgDirection_X = 0;
        let avgDirection_Y = 0;

        for(let i=0;i<boid.neighbors.length;i++){
            var normalizedNeighbor = this.normalize(boid.neighbors[i].xDir,boid.neighbors[i].yDir);
            cumulateDirections_X = cumulateDirections_X + normalizedNeighbor[0];
            cumulateDirections_Y = cumulateDirections_Y + normalizedNeighbor[1];
        }

        avgDirection_X = cumulateDirections_X / boid.neighbors.length;
        avgDirection_Y = cumulateDirections_Y / boid.neighbors.length;

        if(boid.neighbors.length > 0){
            var normalizedAlignement = this.normalize((avgDirection_X-startdirection_X),(avgDirection_Y-startdirection_Y));
            return normalizedAlignement;
        }
        return [0,0]
    }

    cohesion(boid){
        let centerMass_X = 0;
        let centerMass_Y = 0;
        for(let i=0;i<boid.neighbors.length;i++){
                centerMass_X = centerMass_X + boid.neighbors[i].x;
                centerMass_Y = centerMass_Y + boid.neighbors[i].y;
        }
        centerMass_X = centerMass_X / boid.neighbors.length;
        centerMass_Y = centerMass_Y / boid.neighbors.length;
        var normalizedVector = this.normalize(centerMass_X-boid.x,centerMass_Y-boid.y);
        return normalizedVector;
    }

    dodgeFromMouse(boid){
        if(this.mousePosition_X != 0 && this.mousePosition_Y != 0){
            if(this.distance(boid.x,boid.y,this.mousePosition_X,this.mousePosition_Y) < this.mouseDodgeDistance){
                    c.beginPath();
                    c.moveTo(boid.x, boid.y);
                    c.lineTo(this.mousePosition_X, this.mousePosition_Y);
                    c.strokeStyle  = "rgba(255,255,255, 0.05)";
                    c.stroke();
                var normalizedVector = this.normalize(boid.x - this.mousePosition_X,boid.y - this.mousePosition_Y);
                return normalizedVector;
            }
        }
        return [0,0];
    }

    goToFeed(boid){
        if(this.distance(boid.x,boid.y,this.feedPosition_X,this.feedPosition_Y) < 20){
            this.haveFeedOnScreen = false;
            return [0,0];
        }else{
            if(this.distance(boid.x,boid.y,this.feedPosition_X,this.feedPosition_Y) < this.visionRange){
                let magnitude = this.distance(boid.x,boid.y,this.feedPosition_X,this.feedPosition_Y);
                var normalizedVector = this.normalize(((this.feedPosition_X - boid.x)),((this.feedPosition_Y - boid.y)));
                return normalizedVector;
            }
            return [0,0]
        }

    }


    limitSpeed(newDirection){
        let speed = Math.sqrt(newDirection[0]*newDirection[0] + newDirection[1]*newDirection[1]);
        if(speed > this.speedlimit){
            return [(newDirection[0]/speed)*this.speedlimit,(newDirection[1]/speed)*this.speedlimit]
        }
        return newDirection;
    }

    getNeighbors(boid){
        boid.neighbors = [];

        for(let i=0;i<this.boids.length;i++){
            if(this.distance(boid.x,boid.y,this.boids[i].x,this.boids[i].y) < this.visionRange){
                boid.neighbors.push(this.boids[i]);
                /*if(this.distance(boid.x,boid.y,this.boids[i].x,this.boids[i].y) < 40){
                    c.beginPath();
                    c.moveTo(boid.x, boid.y);
                    c.lineTo(this.boids[i].x, this.boids[i].y);
                    c.strokeStyle  = "rgba(255,255,255, 0.1)";
                    c.stroke();
                }*/
            }
        }
    }

    distance(x1,y1,x2,y2){
        return (Math.sqrt((x2-x1)*(x2-x1) + (y2-y1)*(y2-y1)));
    }

    randomNumber(min, max) {  
    return Math.random() * (max - min) + min; 
	}

    normalize(x,y){
        var length = Math.sqrt(x*x + y*y);
        if(length == 0){
            return [0,0];
        }
        return [x/length,y/length];
    }

    changeBoidSize(size){
        this.boidsSize = size;
        for(let i=0;i<this.boids.length;i++){
            this.boids[i].size = this.boidsSize;
        }
    }

    changeBoidColor(wheelValue,color){
        if(wheelValue < 100){
            for(let i=0;i<this.boids.length;i++){
                this.boids[i].changeColor = false;
            }
        }else{
            for(let i=0;i<this.boids.length;i++){
                this.boids[i].changeColor = true;
                //this.boids[i].zoomColor = [255,RemapValue(wheelValue,[0,800],[this.boids[i].scaleValue(this.boids[i].yDir*10,[-10,10],[50,150]),255]),RemapValue(wheelValue,[0,800],[0,255])];
                this.boids[i].zoomColor = [RemapValue(wheelValue,[0,scrollHeight],[255,33]),RemapValue(wheelValue,[0,scrollHeight],[this.boids[i].scaleValue(this.boids[i].yDir*10,[-10,10],[50,150]),33]),RemapValue(wheelValue,[0,scrollHeight],[0,33])];

            }

        }

    }
}

var boidController;

if(canvas.width < scrollHeight+100){
    boidController = new BoidController(150,3,180,7,100,0.5);
}else{
    boidController = new BoidController(300,5,500,15,100,1);
}

boidController.init();
boidController.draw();

canvas.addEventListener("mousemove", function(e) { 
    var cRect = canvas.getBoundingClientRect();
    var canvasX = Math.round(e.clientX - cRect.left);
    var canvasY = Math.round(e.clientY - cRect.top);   
    boidController.mousePosition_X = canvasX;
    boidController.mousePosition_Y = canvasY;
});

canvas.addEventListener("touchmove", function(e) { 
    var cRect = canvas.getBoundingClientRect();
    var canvasX = Math.round(e.touches[0].clientX - cRect.left);
    var canvasY = Math.round(e.touches[0].clientY - cRect.top);   
    boidController.mousePosition_X = e.touches[0].clientX;
    boidController.mousePosition_Y = e.touches[0].clientY;
});

canvas.addEventListener("touchstart", function(e) { 
    if(!boidController.haveFeedOnScreen){
        var cRect = canvas.getBoundingClientRect();
        var posX = Math.round(e.touches[0].clientX - cRect.left);
        var posY = Math.round(e.touches[0].clientY - cRect.top);
        boidController.feedPosition_X = e.touches[0].clientX;
        boidController.feedPosition_Y = e.touches[0].clientY;
        boidController.haveFeedOnScreen = true;
    }
});

canvas.addEventListener("touchend", function(e) { 
        boidController.mousePosition_X = -100;
        boidController.mousePosition_Y = -100;
});



canvas.addEventListener("click", function(e) { 
    var cRect = canvas.getBoundingClientRect();
    var canvasX = Math.round(e.clientX - cRect.left);
    var canvasY = Math.round(e.clientY - cRect.top);
    if(window.scrollY < 500){
        boidController.boids.push(new Boid(canvasX,canvasY,Math.random() * (1 - (-1)) + (-1),Math.random() * (1 - (-1)) + (-1),boidController.boidsSize))
    }
});

window.addEventListener("resize", function(e){
    canvas.width = innerWidth
    canvas.height = innerHeight - navbarSize
});



window.addEventListener('scroll',function(e){
    OnScrollFunction();
});

function OnScrollFunction(){
    var scrollPos_Y = window.scrollY;
    disableScroll();

    boidController.changeBoidSize(RemapValue(scrollPos_Y,[0,scrollHeight],[5,scrollHeight]));
    //boidController.changeBoidColor(scrollPos_Y,RemapValue(scrollPos_Y,[500,800],[50,255]));
    boidController.changeBoidColor(scrollPos_Y,RemapValue(scrollPos_Y,[500,scrollHeight],[255,33]));

    var canvas = document.getElementById("canvas");
    var topnav = document.getElementById("id-topnav");
    var footer = document.getElementById("id-footer");
    var textpresentation = document.getElementById("id-text-presentation");
    var imgpresentation = document.getElementById("id-img-presentation");
    var centertitle = document.getElementById("id-title-center");
    var container = document.getElementById("id-container");

    centertitle.style.opacity = 1-(RemapValue(scrollPos_Y,[0,scrollHeight],[0,100])/100);

    if(scrollPos_Y > scrollHeight){
        //window.scrollTo(0, 801);
        boidController.isRunning = false;

        canvas.style.position = "relative";
        topnav.style.position = "fixed";
        footer.style.position = "fixed";
        topnav.style.setProperty("background-color","rgba(33, 33, 33, 1)","important");
        footer.style.setProperty("background-color","rgba(33, 33, 33, 1)","important");
        textpresentation.classList.add("class-fadein");
        imgpresentation.classList.add("class-fadein");
        container.classList.add("class-fadein");
        container.style.setProperty("pointer-events","all","important")
    }else{
        boidController.isRunning = true;

        canvas.style.position = "fixed"
        topnav.style.position = "absolut";
        footer.style.position = "absolut";
        topnav.style.setProperty("background-color","rgba(33, 33, 33, 0)","important")
        footer.style.setProperty("background-color","rgba(33, 33, 33, 0)","important")

        textpresentation.classList.remove("class-fadein");
        imgpresentation.classList.remove("class-fadein");
        container.classList.remove("class-fadein");
        container.style.setProperty("pointer-events","none","important")
    }
  }

var isscrolling = false;
function disableScroll() {
    // Get the current page scroll position
    scrollTop = 
      window.pageYOffset || document.documentElement.scrollTop;
    scrollLeft = 
      window.pageXOffset || document.documentElement.scrollLeft;

        // if any scroll is attempted,
        // set this to the previous value
        //console.log("value : " + scrollTop);
        if(scrollTop >= 200 && scrollTop < 800 && isscrolling == false){
            isscrolling = true;
            disableScroll2();
            window.scrollTo(0,850);
            setTimeout(enableScroll2,2000)
        }

        if(scrollTop >= 850 && isscrolling == true){
            isscrolling = false;
        }
}


function RemapValue(value, from, to) {
    var scale = (to[1] - to[0]) / (from[1] - from[0]);
    var capped = Math.min(from[1], Math.max(from[0], value)) - from[0];
    return ~~(capped * scale + to[0]);
}

/*
var wheelValue = 0.0;

window.addEventListener("wheel", event => {
    const delta = Math.sign(event.deltaY);
    wheelValue = wheelValue + (delta/3);
    if(wheelValue <0){
        wheelValue = 0;
    }

    if(wheelValue > 9){
        wheelValue = 9;
    }
    boidController.changeBoidSize(RemapValue(Math.exp(wheelValue),[0,5000],[5,800]));
    boidController.changeBoidColor(wheelValue,RemapValue(Math.exp(wheelValue),[0,5000],[50,255]))
    console.log(RemapValue(Math.exp(wheelValue),[0,5000],[150,255]));
});
*/
document.addEventListener("contextmenu", function(e){
    if(!boidController.haveFeedOnScreen){
        var cRect = canvas.getBoundingClientRect();
        var posX = Math.round(e.clientX - cRect.left);
        var posY = Math.round(e.clientY - cRect.top);
        boidController.feedPosition_X = posX;
        boidController.feedPosition_Y = posY;
        boidController.haveFeedOnScreen = true;
    }
    if(boidController.isRunning){
        e.preventDefault();
    }
  }, false);


  window.onbeforeunload = function () {
    window.scrollTo(0, 0);
  }

function menuclick(name){
    switch(name){
        case 'Home':
            window.scrollTo(0, 0);
            break;
        case 'About':
            window.scrollTo(0, 850);
            break;
        case 'Realtime':
            window.scrollTo(0, 1850);
            break;
        case 'Web':
            window.scrollTo(0, 6830);
            break;
        case 'Robotics':
            window.scrollTo(0, 7940);
            break;
    }
};