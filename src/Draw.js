import Dimensions from './Dimensions';
import { ReactP5Wrapper } from "@p5-wrapper/react";

import * as poseDetection from '@tensorflow-models/pose-detection';
import * as tf from '@tensorflow/tfjs-core';
// Register one of the TF.js backends.
import '@tensorflow/tfjs-backend-webgl';


let detector;
let detectorConfig;
let edges;
let video;
let poses;
let skeleton = true;
let elbowAngle = 999;
let backAngle = 0;
let reps = 0;
var scale = 1;
let upPosition = false;
let downPosition = false;
let highlightBack = false;
let isOn = false;
let backWarningGiven = false;
let timeCount = 0;

function App() {

  const { height, width } = Dimensions();

  function iterateTime(counter){

    timeCount = Math.floor(counter / 10);
    if (counter === 600){
    }else if (isOn){
      setTimeout(function(){iterateTime(counter + 1); }, 100);
    }
  }              

  scale = width / 640;
  var scaleH = (height - 50) / 480;
  if (scaleH < scale){
    scale = scaleH;
  }
  scale = scale * 0.95;

  async function repeatPose(){
    try{
      poses = await detector.estimatePoses(video.elt);
    }catch(err){

    }
    setTimeout(repeatPose, 100);
  }

  async function init(){
    await tf.ready();
    detectorConfig = { modelType: poseDetection.movenet.modelType.SINGLEPOSE_THUNDER };
    detector = await poseDetection.createDetector(poseDetection.SupportedModels.MoveNet, detectorConfig);
    edges = {
      '5,7': 'm',
      '7,9': 'm',
      '6,8': 'c',
      '8,10': 'c',
      '5,6': 'y',
      '5,11': 'm',
      '6,12': 'c',
      '11,12': 'y',
      '11,13': 'm',
      '13,15': 'm',
      '12,14': 'c',
      '14,16': 'c'
    };

    await repeatPose();
  }



  function checkComponents(){
    if (poses && poses.length > 0){
      var nose = poses[0].keypoints[0];
      var leftEye = poses[0].keypoints[1];
      var rightEye = poses[0].keypoints[2];
      var leftEar = poses[0].keypoints[3];
      var leftWrist = poses[0].keypoints[9];
      var leftShoulder = poses[0].keypoints[5];
      var leftElbow = poses[0].keypoints[7];
      var leftHip = poses[0].keypoints[11];
      var leftKnee = poses[0].keypoints[13];

      if (nose.score > 0.3 || leftEye.score > 0.3 || rightEye.score > 0.3){
      }else{
        return "Nose"
      }

      if (leftShoulder.score > 0.3 || leftEar.score > 0.3){

      }else{
        return 'Left Shoulder';
      }

//  rightWrist = poses[0].keypoints[10];
//  rightShoulder = poses[0].keypoints[6];
//  rightElbow = poses[0].keypoints[8];


      if (leftWrist.score > 0.3 && leftElbow.score > 0.3) {
        if (leftHip.score <= 0.3){
          return "Left Hip";
        }else if (leftKnee.score <= 0.3){
          return "Left Knee";
        }
      }else{
        if (leftWrist.score <= 0.3){
          return "Left Wrist";
        }else if (leftElbow.score <= 0.3){
          return "Left Elbow";
        }
      } 
    }
    return "";
  }

function drawKeypoints(p5){
  if (poses && poses.length > 0) {
    for (let kp of poses[0].keypoints) {
      if (kp.score > 0.3) {
        p5.fill(255);
        p5.stroke(0);
        p5.strokeWeight(4);
        p5.circle(kp.x * scale, kp.y * scale, 16);
      }
      updateArmAngle();
      updateBackAngle();
    }
  }  
}
// Draws lines between the keypoints
function drawSkeleton(p5) {
  var confidence_threshold = 0.3;

  if (poses && poses.length > 0) {
    for (const [key, value] of Object.entries(edges)) {
      const p = key.split(",");
      const p1 = p[0];
      const p2 = p[1];

      const y1 = poses[0].keypoints[p1].y;
      const x1 = poses[0].keypoints[p1].x;
      const c1 = poses[0].keypoints[p1].score;
      const y2 = poses[0].keypoints[p2].y;
      const x2 = poses[0].keypoints[p2].x;
      const c2 = poses[0].keypoints[p2].score;

      if ((c1 > confidence_threshold) && (c2 > confidence_threshold)) {
        if ((highlightBack === true) && ((p[1] === 11) || ((p[0] === 6) && (p[1] === 12)) || (p[1] === 13) || (p[0] === 12))) {
          p5.strokeWeight(3);
          p5.stroke('red');
          p5.line(x1 * scale, y1 * scale, x2 * scale, y2 * scale);
        }
        else {
          p5.strokeWeight(2);
          p5.stroke('green');
          p5.line(x1 * scale, y1 * scale, x2 * scale, y2 * scale);
        }
      }
    }
  }
}

function updateArmAngle() {
  /*
  rightWrist = poses[0].keypoints[10];
  rightShoulder = poses[0].keypoints[6];
  rightElbow = poses[0].keypoints[8];
  */
  var leftWrist = poses[0].keypoints[9];
  var leftShoulder = poses[0].keypoints[5];
  if (leftShoulder.score < 0.3){
    leftShoulder = poses[0].keypoints[3]; //use leftEar instead.
  }
  var leftElbow = poses[0].keypoints[7];


  if (leftWrist.score > 0.3 && leftElbow.score > 0.3 && leftShoulder.score > 0.3) {
    var angle = (
      Math.atan2(
        leftWrist.y - leftElbow.y,
        leftWrist.x - leftElbow.x
      ) - Math.atan2(
        leftShoulder.y - leftElbow.y,
        leftShoulder.x - leftElbow.x
      )
    ) * (180 / Math.PI);

    // if (angle < 0) {
    //   angle = angle + 360;
    // }

    elbowAngle = angle;
  }else {
    //console.log('Cannot see elbow');
  }

}

function updateBackAngle() {

  var gotComp = checkComponents();
  if (gotComp){
    return;
  }

  var leftShoulder = poses[0].keypoints[5];
  var leftHip = poses[0].keypoints[11];
  var leftKnee = poses[0].keypoints[13];

  var angle = (
    Math.atan2(
      leftKnee.y - leftHip.y,
      leftKnee.x - leftHip.x
    ) - Math.atan2(
      leftShoulder.y - leftHip.y,
      leftShoulder.x - leftHip.x
    )
  ) * (180 / Math.PI);
  angle = angle % 180;
  if (angle < 0){
    angle = angle + 180;
  }
  backAngle = angle;

  if ((backAngle > 0 && backAngle < 20)  || (backAngle > 160)) {
    highlightBack = false;
  }
  else {
    highlightBack = true;
    if (backWarningGiven !== true) {
      var msg = new SpeechSynthesisUtterance('Keep your back straight');
      window.speechSynthesis.speak(msg);
      backWarningGiven = true;
    }
  }

}

function inUpPosition() {
  if (elbowAngle > 170 && elbowAngle < 200) {
    //console.log('In up position')
    if (downPosition === true) {
      if (timeCount >= 60){
        upSpeak('Time Out');
      }else{
        upSpeak((reps+1) + '');
        if (reps === 0){
          isOn = true;
          iterateTime(0);
        }
        reps = reps + 1;        
      }
    }
    upPosition = true;
    downPosition = false;
  }
}

function reset(e){
  isOn = false;
  reps = 0;
  timeCount = 0;
}

async function upSpeak(txt){
  var msg = new SpeechSynthesisUtterance(txt);
  window.speechSynthesis.speak(msg);
}

function inDownPosition(p5) {
  var elbowAboveNose = false;
  var nose = poses[0].keypoints[0];
  var leftEye = poses[0].keypoints[1];
  var rightEye = poses[0].keypoints[2];

  var noseY = 0;
  if (nose.score){
    noseY = nose.y;
  }else if (leftEye.score){
    noseY = leftEye.y;
  }else if (rightEye.score){
    noseY = rightEye.y;
  }
  p5.stroke('white');
  p5.textSize(30 * scale);
  if (noseY > 0.9 * poses[0].keypoints[7].y) {
    elbowAboveNose = true;

    if (highlightBack){
      p5.text('Back not straight', 10 * scale, 400 * scale);          
//        p5.text('Back highlight', 10 * scale, 400 * scale);          
    }else{
      if ((Math.abs(elbowAngle) > 70) && (Math.abs(elbowAngle) < 110)) {
        //console.log('In down position')
        if (upPosition === true) {
          upSpeak('Up');
        }
        downPosition = true;
        upPosition = false;
      }else{
        p5.text('Elbow angle ' + elbowAngle, 10 * scale, 400 * scale);          
      }
    }

  }
  else {
    p5.text('Elbow not above nose', 10 * scale, 400 * scale);          
//    p5.text('Elbow not above nose', 10 * scale, 400 * scale);          
  }

}


function sketch(p5) {
  p5.setup = async() => {
    video = p5.createCapture(p5.VIDEO);
    video.hide();
   p5.createCanvas(640 * scale, 480 * scale); //.parent(canvasParentRef);
    await init();
    };

  p5.draw = () => {
  //    console.log(p5);
     p5.background(220);
    p5.translate(640 * scale, 0);

     p5.scale(-1, 1);
     if (video){
      p5.image(video, 0, 0, video.width * scale, video.height * scale);    
     }

      // // // Draw keypoints and skeleton
     drawKeypoints(p5);
      if (skeleton) {
        drawSkeleton(p5);
      }

      // // // Write text
//      p5.fill(255);
      p5.strokeWeight(2);
      p5.translate(640 * scale, 0);
      p5.scale(-1, 1);
      p5.textSize(60 * scale);

      p5.stroke('white');

      if (poses && poses.length > 0) {
        var gotComp = checkComponents();
        if (!gotComp) {
          p5.fill('green');
          let pushupString = `Push-ups completed: ${reps}`;
          p5.text(pushupString, 10 * scale, 100 * scale);
          inUpPosition();
          inDownPosition(p5);

        }
        else {
          p5.fill('red');
          p5.text(gotComp + ' not visible', 10 * scale, 100 * scale);
        }

        p5.fill('black');
        if (timeCount >= 60){
          p5.text('Time Out. Click Reset.', 10 * scale, 250 * scale);          
        }else if (isOn){
          p5.text('Time : ' + (60 - timeCount), 10 * scale, 250 * scale);          
        }
        // p5.text('W ' + width + ' H ' + height, 10 * scale, 400 * scale);          

//        p5.text('Back: ' + backAngle, 10 * scale, 300 * scale);

      }
      else {
        p5.fill('black');
        p5.text('Loading...', 10 * scale, 100 * scale);
      }


  };
}

//   var resetPiece = null;
//   if (isOn){
//     resetPiece = 
// //    
//   }


  return (
    <div >
      <button onClick={reset}>Reset</button>
      <ReactP5Wrapper sketch={sketch} />
    </div>
  );
}

export default App;
