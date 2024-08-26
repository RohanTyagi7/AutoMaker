import './App.css';
import { useState, useEffect } from "react";
import fieldImage from './2024Field.png';

export default function App() {

  var [targets, setTargets] = useState([]);
  var [trajectories, setTrajectories] = useState([]);
  var [files, setFiles] = useState([]);
  var [name, setName] = useState("");
  const [seed, setSeed] = useState(1);
  const reset = () => {
      setSeed(Math.random());
  }
  const [seed2, setSeed2] = useState(1);
  const resetTable = () => {
      setSeed2(Math.random());
  }

  function printMousePos(event) {
    let xRobot = ((event.clientX-document.getElementById("field").offsetLeft)/document.getElementById("field").clientWidth)*16.541052;
    let yRobot = (1-(event.clientY-document.getElementById("field").offsetTop)/document.getElementById("field").clientHeight)*8.211231;
    setTargets((previous) => {
      let x = previous.concat([{x: xRobot, y: yRobot, theta: 0, type: "Regular", id: previous.length, status: "Edit", delay: 0, continueAsPlanned: ["continue","continue","continue","continue"]}]); //continueAsPlanned [if0,0, if0,1, if1,0, if1,1] "continue"=continue as planned, "divert{number}"=next trajectory to target number and continue from there, "shoot"=dynamic shot from position
      for(let i = 0; i < x.length-1; i++){
        x[i]["status"] = null;
      }
      return x;
    })
    reset();
}

  useEffect(() => {
    document.getElementById("field").addEventListener("click", printMousePos);
  },[]);

  function edit(id){
    for(let i = 0; i < targets.length; i++){
      if(i == id){
        targets[i]["status"] = "Edit";
      }
      else{
        targets[i]["status"] = null;
      }
    }
    reset();
  }
  function whichEdit(){
    for(let i = 0; i < targets.length; i++){
      if( targets[i]["status"] == "Edit" && targets[i]["type"] != "Translation"){
        return i;
      }
    }
    return -1;
  }
  function amountTranslationBefore(id){
    let c = 0;
    for(let i = 0; i < id; i++){
      
      if(trajectories[i] && trajectories[i]["translation"][0]["x"] != -1){
        console.log(trajectories[i])
        c+= trajectories[i]["translation"].length;
      }
      
    }
    return c;
  }

  function redoIndex(){
    for(let i = 0; i < targets.length; i++){
      targets[i]["id"] = i;
    }
  }

  const createSmoothPath = (positions) => {
    if (positions.length < 2) return '';

    const pathData = positions.reduce((acc, pos, index, arr) => {
      if (index === 0) {
        return `M ${pos.x/16.541052*document.getElementById("field")?.clientWidth} ${(1-(pos.y/8.211231))*document.getElementById("field")?.clientHeight}`;
      } else {
        const prevPos = arr[index - 1];
        const controlPointX1 = (prevPos.x/16.541052*document.getElementById("field")?.clientWidth + pos.x/16.541052*document.getElementById("field")?.clientWidth) / 2;
        const controlPointY1 = (1-(prevPos.y/8.211231))*document.getElementById("field")?.clientHeight;
        const controlPointX2 = (prevPos.x/16.541052*document.getElementById("field")?.clientWidth + pos.x/16.541052*document.getElementById("field")?.clientWidth) / 2;
        const controlPointY2 = (1-(pos.y/8.211231))*document.getElementById("field")?.clientHeight;

        return `${acc} C ${controlPointX1} ${controlPointY1}, ${controlPointX2} ${controlPointY2}, ${pos.x/16.541052*document.getElementById("field")?.clientWidth} ${(1-(pos.y/8.211231))*document.getElementById("field")?.clientHeight}`;
      }
    }, '');

    return pathData;
  };

  useEffect(() => {
    setTrajectories((previous) => { 
    let lastNonTranslate = -1;
    for(let i = 0; i < targets.length; i++){
      if(targets[i]["type"].toLowerCase() == "translation"){
        if(previous[lastNonTranslate]["translation"][0]["x"] == -1 && previous[lastNonTranslate]["translation"][0]["y"] == -1){
          previous[lastNonTranslate]["translation"][0]["x"] = targets[i]["x"];
          previous[lastNonTranslate]["translation"][0]["y"] = targets[i]["y"];
        }
        else{
          previous[lastNonTranslate]["translation"] = previous[lastNonTranslate]["translation"].concat({x: targets[i]["x"], y: targets[i]["y"]});
        }
        
      }
      else{
        var type = 0;
        try {
          if(previous[lastNonTranslate]["end"]["x"] > 0){
            previous[lastNonTranslate] = {start: [{x:0, y:0, theta:0}], end: [{x:0, y:0, theta:0}], translation: [{x:-1, y:-1}], attribute: null, id: null};
            previous[lastNonTranslate]["start"]["x"] = targets[i]["x"]
            previous[lastNonTranslate]["start"]["y"] = targets[i]["y"]
            previous[lastNonTranslate]["start"]["theta"] = targets[i]["theta"]
          }
          else{
            previous[lastNonTranslate]["end"]["x"] = targets[i]["x"]
            previous[lastNonTranslate]["end"]["y"] = targets[i]["y"]
            previous[lastNonTranslate]["end"]["theta"] = targets[i]["theta"]
            lastNonTranslate++;
            previous[lastNonTranslate]["start"]["x"] = targets[i]["x"]
            previous[lastNonTranslate]["start"]["y"] = targets[i]["y"]
            previous[lastNonTranslate]["start"]["theta"] = targets[i]["theta"]
            type = 1;
          }
        } catch (error) {
          lastNonTranslate++;
          previous[lastNonTranslate] = {start: [{x:0, y:0, theta:0}], end: [{x:0, y:0, theta:0}], translation: [{x:-1, y:-1}], attribute: null, id: null};
          previous[lastNonTranslate]["start"]["x"] = targets[i]["x"]
          previous[lastNonTranslate]["start"]["y"] = targets[i]["y"]
          previous[lastNonTranslate]["start"]["theta"] = targets[i]["theta"]
        }
        let m = ""
        if(targets[i]["type"].toLowerCase() == "shot"){
          m += (type)?("Shoot After"):("Shoot Before");
        }
        if(targets[i]["type"].toLowerCase() != "translation" && i < targets.length-1){
          m += "Intake On Before";
        }
        previous[lastNonTranslate]["attribute"] = m;
        previous[lastNonTranslate]["id"] = lastNonTranslate/2;
      }
    }
    resetTable();
    return previous;
    })
    
  }, [targets, seed, name])

  useEffect(()=> {
    document.getElementById("codeOutput").value = `${name}JSON =  ${JSON.stringify(targets)}
        self.auton_selector.setDefaultOption("${name}", autoRunner(self.s_Swerve, self.s_Intake, self.s_Indexer, self.s_Shooter, self.s_Arm, self.s_Vision, ${name}JSON).getCommand())`
    //console.log(targets)
  }, [seed, seed2, targets, trajectories, name])

  function distance(x1, y1, x2, y2, transition){
    let dist = 0;
    for(let i = 0; i < transition.length; i++){
      if(transition[i]["x"] != -1 && transition[i]["y"] != -1){
        if(i == 0){
          dist += Math.sqrt(Math.pow(transition[i]["x"]-x1, 2) + Math.pow(transition[i]["y"]-y1, 2))
        }
        else{
          dist += Math.sqrt(Math.pow(transition[i]["x"]-transition[i-1]["x"], 2) + Math.pow(transition[i]["y"]-transition[i-1]["y"], 2))
        }
      }
    }
    if(transition[transition.length-1]["x"] != -1 && transition[transition.length-1]["y"] != -1){dist += Math.sqrt(Math.pow(x2-transition[transition.length-1]["x"], 2) + Math.pow(y2-transition[transition.length-1]["y"], 2))}
    else{dist += Math.sqrt(Math.pow(x2-x1, 2) + Math.pow(y2-y1, 2))}
    return (dist)
  }

  useEffect(() => {
    displayProg();
  }, [seed])

  useEffect(() => {
    document.getElementById("nameinput").value = name;
  }, [name])

  useEffect(() => {
    setFiles(JSON.parse(localStorage.getItem("autons")));
    //console.log(JSON.parse(localStorage.getItem("autons")))
  }, [localStorage.getItem("autons"), seed])

  function displayProg(){
    let str = document.getElementById("codeOutput").value;
    console.log(str)
    console.log(str.substring(str.indexOf("= ") + 2, str.indexOf("\n")))
    str = (JSON.parse(str.substring(str.indexOf("= ") + 2, str.indexOf("\n") )))    
    if(str && str.length > 0){setTargets((str));}
    
  }

  async function wpaste() {
    const text = await navigator.clipboard.readText() + "";
    console.log(text);
    return new Promise(resolve => {
      setTimeout(() => {
          resolve({txt: text});
      }, 100);
  });
  }

  function deleteFile(n){
    let x = JSON.parse(localStorage.getItem("autons"))
    for (var i = x.length-1; i >= 0; i--) {
      if (x[i]['name'] == n){
        x.splice(i,1);
        localStorage.setItem("autons", JSON.stringify(x))
      }
    }
  }

  function contains(val) {
    for (var i = 0; i < JSON.parse(localStorage.getItem("autons")).length; i++) {
      if (JSON.parse(localStorage.getItem("autons"))[i]['name'] === val) return true;
    }
    return false;
  }



  let [totalTime, setTotalTime] = useState(0);

  function redToBlue(t){
    let z = t
    for(let i = 0; i < t.length; i++){
      z[i]["x"] = 16.541052-t[i]["x"];
      z[i]["theta"] = t[i]["theta"]-180;
    }
    return z;
  }

  function blueToRed(t){
    let z = t
    for(let i = 0; i < t.length; i++){
      z[i]["x"] = 16.541052-t[i]["x"];
      z[i]["theta"] = 180-t[i]["theta"];
    }
    return z;
  }

  function blueToRedTraj(t){
    let z = t;
    for(let i = 0; i < t.length; i++){
      if(z[i]){
      z[i]["start"]["x"] = 16.541052-t[i]["start"]["x"];
      z[i]["start"]["theta"] = 180-t[i]["start"]["theta"];
      z[i]["end"]["x"] = 16.541052-t[i]["end"]["x"];
      z[i]["end"]["theta"] = 180-t[i]["end"]["theta"];
      for(let j = 0; j < z[i]["translation"].length; j++){
        if(z[i]["translation"][j]["x"] != -1){
          z[i]["translation"][j]["x"] = 16.541052-t[i]["translation"][j]["x"];
        }
      }
      }
    }
    return z;
  }
  function redToBlueTraj(t){
    let z = t;
    for(let i = 0; i < t.length; i++){
      if(z[i]){
      z[i]["start"]["x"] = 16.541052-t[i]["start"]["x"];
      z[i]["start"]["theta"] = t[i]["start"]["theta"]-180;
      z[i]["end"]["x"] = 16.541052-t[i]["end"]["x"];
      z[i]["end"]["theta"] = t[i]["end"]["theta"]-180;
      for(let j = 0; j < z[i]["translation"].length; j++){
        if(z[i]["translation"][j]["x"] != -1){
          z[i]["translation"][j]["x"] = 16.541052-t[i]["translation"][j]["x"];
        }
      }
      }
    }
    return z;
  }

  return (
    <div onClick={(e)=>{if((e.clientY > (document.getElementById("field").offsetTop+document.getElementById("field").clientHeight) || e.clientY < (document.getElementById("field").offsetTop)) || (e.clientX > ((document.getElementById("field").offsetLeft+document.getElementById("field").clientWidth || e.clientX < (document.getElementById("field").offsetLeft))))){edit();}}}>
      <span style={{position: "absolute", top: "20px", left: "20px"}}><span style={{fontSize: "30px"}}>Auton: </span><input type="text" placeholder="Type here..." id="nameinput" onChange={(e)=>{e.preventDefault(); setName(document.getElementById("nameinput").value.replace(" ", ""))}} style={{fontSize: "30px", border: "0px", borderBottom: "3px solid grey"}} onFocus={(e)=>{document.getElementById("nameinput").style.borderBottom = "4px solid lightgreen"}} onBlur={(e)=>{document.getElementById("nameinput").style.borderBottom = "4px solid grey"}}/> <button style={{border: "2px solid lightgreen", borderRadius: "5px", width: "70px", height: "40px", color: "lightgreen", backgroundColor: "rgba(0,0,0,0)", fontSize:"20px", cursor: "pointer"}} id="savebutton" onMouseOver={(e)=>{document.getElementById("savebutton").style.backgroundColor = "rgba(40,100,40,0.3)"}} onMouseUp={(e)=>{document.getElementById("savebutton").style.backgroundColor = "rgba(40,100,40,0.3)"}} onMouseOut={(e)=>{document.getElementById("savebutton").style.backgroundColor = "rgba(0,0,0,0)"}} onMouseDown={(e)=>{document.getElementById("savebutton").style.backgroundColor = "rgba(40,100,40,0.6)"}} onClick={(e)=>{
        if(name != ""){
        if(localStorage.getItem("autons") == null){
          localStorage.setItem("autons", JSON.stringify([{name: name, targets: targets}]))
        }
        else{
          if(!contains(name)){
            localStorage.setItem("autons", JSON.stringify(JSON.parse(localStorage.getItem("autons")).concat(({name: name, targets: targets}))))
          }
          else{
            let xbool = confirm("Do you want to replace the old file with this new path?")
            if(xbool){
              let z = JSON.parse(localStorage.getItem("autons"));
              for(let i = 0; i < z.length; i++){
                if(z[i]["name"] == name){
                  z[i]["targets"] = targets
                }
              }
              localStorage.setItem("autons", JSON.stringify(z));
            }
            else{
              let ybool = confirm("Do you want to make this a new file?")
              if(ybool){
                if(name.includes(" (") && name.includes(")") && parseInt(name.substring(name.lastIndexOf(" (")+2, name.lastIndexOf(")"))) > 0){
                  localStorage.setItem("autons", JSON.stringify(JSON.parse(localStorage.getItem("autons")).concat(({name: name.substring(0,name.lastIndexOf(" (")+2) + (parseInt(name.substring(name.lastIndexOf(" (")+2, name.lastIndexOf(")"))) + 1) + ")", targets: targets}))))
                }
                else{
                  localStorage.setItem("autons", JSON.stringify(JSON.parse(localStorage.getItem("autons")).concat(({name: name + " (1)", targets: targets}))))
                }
              }
            }
          }
        }
        reset();
        }
        else{
          alert("No Auto Name Set");
        }
        }}>Save</button> </span>
      <center>
      <br></br>
      <svg style={{position: 'absolute', left: (0.876/16.541052)*document.getElementById("field")?.clientWidth/2, top: (0.876/8.211231)*document.getElementById("field")?.clientHeight/2, width: '100%', height: '100%', pointerEvents:"none", marginTop: document.getElementById("field")?.offsetTop-((0.876/8.211231)*document.getElementById("field")?.clientHeight)/2, marginLeft: document.getElementById("field")?.offsetLeft-((0.876/16.541052)*document.getElementById("field")?.clientWidth)/2}}>
      <path
          d={createSmoothPath(targets)}
          fill="transparent"
          stroke="black"
          strokeWidth="4"
        />
          
      </svg>
        <img src={fieldImage} id="field" style={{width: "900px", marginTop: "10%", outline: "2px solid lightgreen", borderRadius: "15px"}}/>
        
        {targets?.map((data)=>{
          return (
            (data.type.toLowerCase() != "translation")?(
              <div onContextMenu={(e)=>{e.preventDefault(); let xbool = confirm("Do you want to delete target " + data.id + "?"); if(xbool){targets.splice(data.id, 1); redoIndex(); reset();}}} key={seed*data.id} id={"robot" + data.id} style={{height: "50px", cursor: "pointer", width: "auto", position: "absolute", marginTop: document.getElementById("field")?.offsetTop-((0.876/8.211231)*document.getElementById("field")?.clientHeight)/2, marginLeft: document.getElementById("field")?.offsetLeft-((0.876/16.541052)*document.getElementById("field")?.clientWidth)/2, left: data.x/16.541052*document.getElementById("field")?.clientWidth + "px", top: (1-(data.y/8.211231))*document.getElementById("field")?.clientHeight + "px", rotate: `${-1*data.theta}deg`}}><div onMouseDown={(e)=>{(data.status=="Edit")?(targets[data.id]["x"] = ((e.clientX-document.getElementById("field").offsetLeft)/document.getElementById("field").clientWidth)*16.541052, targets[data.id]["y"] = (1-(e.clientY-document.getElementById("field").offsetTop)/document.getElementById("field").clientHeight)*8.211231):(edit(data.id)); reset(); }} style={{background: (data.status=="Edit")?("radial-gradient(#fff, blue)"):(""), width: (0.876/16.541052)*document.getElementById("field")?.clientWidth + "px", height: (0.876/8.211231)*document.getElementById("field")?.clientHeight + "px", border: `3px solid ${(data.status == "Edit")?((data.type != "Shot")?("blue"):("red")):((data.type != "Shot")?("grey"):("red"))}`, borderRadius: "5px"}}>&larr;<br></br><span style={{color: "blue", backgroundColor: "rgba(0,0,0,0)"}}>{data.id}</span></div>{(data.status == "Edit")?(<div><div style={{transform: `translate(${(0.876/16.541052)*document.getElementById("field")?.clientWidth/2 +20}px, ${(-0.876/8.211231)*document.getElementById("field")?.clientHeight }px)`, width: "15px", height: "40px", borderRadius: "10%", outline: "2px solid black" }}><button onMouseDownCapture={(e)=>{targets[data.id]["theta"]+= 5; reset();}} style={{width: "15px", fontSize: "15px", padding: "0px", margin: "0px"}}>+</button><button onMouseDownCapture={(e)=>{targets[data.id]["theta"]-=5; reset();}} style={{width: "15px", fontSize: "15px", padding: "0px", margin: "0px"}}>-</button></div><div style={{transform: `translate(0px, ${(-0.876/8.211231)*document.getElementById("field")?.clientHeight+10}px)`, width: "fit-content", height: "auto", borderRadius: "10%", outline: "2px solid black" }}><button onMouseDownCapture={(e)=>{targets[data.id]["type"] = "Shot"; reset();}} style={{fontSize: "15px", padding: "0px", margin: "0px"}}>S</button><button onMouseDownCapture={(e)=>{targets[data.id]["type"] = "Translation"; reset();}} style={{fontSize: "15px", padding: "0px", margin: "0px"}}>T</button><button onMouseDownCapture={(e)=>{targets[data.id]["type"] = "Regular"; reset();}} style={{fontSize: "15px", padding: "0px", margin: "0px"}}>R</button></div></div>):("")}</div>
            ):
            (
              <div onContextMenu={(e)=>{e.preventDefault(); let xbool = confirm("Do you want to delete target " + data.id + "?"); if(xbool){targets.splice(data.id, 1); redoIndex(); reset();}}} onClick={(e)=>{ edit(data.id);}} key={seed*data.id} style={{cursor: "pointer", width: ((0.876/16.541052)*document.getElementById("field")?.clientWidth)/2 + "px", height: ((0.876/8.211231)*document.getElementById("field")?.clientHeight)/2 + "px", border: `6px solid ${(data.status == "Edit")?("blue"):("grey")}`, borderRadius: "100%", position: "absolute", marginTop: document.getElementById("field")?.offsetTop, marginLeft: document.getElementById("field")?.offsetLeft, left: ((data.x/16.541052)*document.getElementById("field").clientWidth)-((0.876/16.541052)*document.getElementById("field")?.clientWidth)/3 + "px", top: ((data.y/-8.211231 +1)*document.getElementById("field").clientHeight)-((0.876/8.211231)*document.getElementById("field")?.clientHeight)/3 + "px", borderStyle: "dashed"}}><p style={{color: "red", backgroundColor: "rgba(0,0,0,0)", marginTop: "3px"}}>{data.id}</p>{(data.status == "Edit")?(<div style={{transform: `translate(-10px,  25px)`, width: "45px", height: "auto", borderRadius: "10%", outline: "2px solid black" }}><button onMouseDownCapture={(e)=>{targets[data.id]["type"] = "Shot"; reset();}} style={{fontSize: "15px", padding: "0px", margin: "0px"}}>S</button><button onMouseDownCapture={(e)=>{targets[data.id]["type"] = "Translation"; reset();}} style={{fontSize: "15px", padding: "0px", margin: "0px"}}>T</button><button onMouseDownCapture={(e)=>{targets[data.id]["type"] = "Regular"; reset();}} style={{fontSize: "15px", padding: "0px", margin: "0px"}}>R</button></div>):("")}</div> 
            )
          )
        })}
        
      </center>
      <center style={{position:"absolute", top:"0px", marginTop: "11%", width: (window.screen.width-900)/2}}>
      <table style={{border: "2px solid lightgreen"}}>
        <tr>
          <th>X</th>
          <th>Y</th>
          <th>θ</th>
          <th>Type</th>
        </tr>
        {targets.sort(function(a, b) {return a.id - b.id;})?.map((data)=> {
          
          return (
            <tr key={seed2*data.id + "table"}>
              <td>{Math.round(data.x*1000)/1000}</td>
              <td>{Math.round(data.y*1000)/1000}</td>
              <td>{data.theta}°</td>
              <td>{data.type}</td>
              <td><button onClick={(e)=>{e.preventDefault(); targets[data.id-1]["id"] += 1; targets[data.id]["id"] -= 1; resetTable();}}>&uarr;</button></td>
              <td><button onClick={(e)=>{e.preventDefault(); targets[data.id+1]["id"] -= 1; targets[data.id]["id"] += 1; resetTable();}}>&darr;</button></td>
            </tr>
          )
        })}
      </table>
      <div><center style={{backgroundColor: "rgba(0,0,0,0)"}}><p>{(whichEdit() >= 0)?(<div key={seed+"bb"} style={{backgroundColor: "rgba(0,0,0,0)"}}>
      On No Beam Break, Do: <br></br><button className="continueConditional" style={{backgroundColor: (targets[whichEdit()]["continueAsPlanned"][0] == "continue")?("rgba(40,100,40,0.7)"):("")}} onClick={(e)=>{targets[whichEdit()]["continueAsPlanned"][0] = "continue"; reset();}}>Continue</button><button style={{backgroundColor: (targets[whichEdit()]["continueAsPlanned"][0].includes("divert"))?("rgba(40,100,40,0.7)"):("")}} className="divertConditional">Divert to <input type="number" className="divertInputConditional" onChange={(e)=>{targets[whichEdit()]["continueAsPlanned"][0] = "divert"+document.getElementById("dive1").value;}} placeholder={(targets[whichEdit()]["continueAsPlanned"][0].includes("divert"))?(parseInt(targets[whichEdit()]["continueAsPlanned"][0].replace("divert", ""))):(0)} id="dive1" onBlur={(e)=>{reset();}} onSubmit={(e)=>{e.preventDefault(); reset();}}></input></button><button className="shootConditional" style={{backgroundColor: (targets[whichEdit()]["continueAsPlanned"][0] == "shoot")?("rgba(40,100,40,0.7)"):("")}} onClick={(e)=>{targets[whichEdit()]["continueAsPlanned"][0] = "shoot"; reset();}}>Shoot</button>
      <br></br><br></br>
      On Indexer Beam Break, Do: <br></br><button className="continueConditional" style={{backgroundColor: (targets[whichEdit()]["continueAsPlanned"][1] == "continue")?("rgba(40,100,40,0.7)"):("")}} onClick={(e)=>{targets[whichEdit()]["continueAsPlanned"][1] = "continue"; reset();}}>Continue</button><button style={{backgroundColor: (targets[whichEdit()]["continueAsPlanned"][1].includes("divert"))?("rgba(40,100,40,0.7)"):("")}} className="divertConditional">Divert to <input type="number" className="divertInputConditional" onChange={(e)=>{targets[whichEdit()]["continueAsPlanned"][1] = "divert"+document.getElementById("dive2").value;}} placeholder={(targets[whichEdit()]["continueAsPlanned"][1].includes("divert"))?(parseInt(targets[whichEdit()]["continueAsPlanned"][1].replace("divert", ""))):(0)} id="dive2" onBlur={(e)=>{reset();}} onSubmit={(e)=>{e.preventDefault(); reset();}}></input></button><button className="shootConditional" style={{backgroundColor: (targets[whichEdit()]["continueAsPlanned"][1] == "shoot")?("rgba(40,100,40,0.7)"):("")}} onClick={(e)=>{targets[whichEdit()]["continueAsPlanned"][1] = "shoot"; reset();}}>Shoot</button>
      <br></br><br></br>
      On Intake Beam Break, Do: <br></br><button className="continueConditional" style={{backgroundColor: (targets[whichEdit()]["continueAsPlanned"][2] == "continue")?("rgba(40,100,40,0.7)"):("")}} onClick={(e)=>{targets[whichEdit()]["continueAsPlanned"][2] = "continue"; reset();}}>Continue</button><button style={{backgroundColor: (targets[whichEdit()]["continueAsPlanned"][2].includes("divert"))?("rgba(40,100,40,0.7)"):("")}} className="divertConditional">Divert to <input type="number" className="divertInputConditional" onChange={(e)=>{targets[whichEdit()]["continueAsPlanned"][2] = "divert"+document.getElementById("dive3").value;}} placeholder={(targets[whichEdit()]["continueAsPlanned"][2].includes("divert"))?(parseInt(targets[whichEdit()]["continueAsPlanned"][2].replace("divert", ""))):(0)} id="dive3" onBlur={(e)=>{reset();}} onSubmit={(e)=>{e.preventDefault(); reset();}}></input></button><button className="shootConditional" style={{backgroundColor: (targets[whichEdit()]["continueAsPlanned"][2] == "shoot")?("rgba(40,100,40,0.7)"):("")}} onClick={(e)=>{targets[whichEdit()]["continueAsPlanned"][2] = "shoot"; reset();}}>Shoot</button>
      <br></br><br></br>
      On Both Beam Breaks, Do: <br></br><button className="continueConditional" style={{backgroundColor: (targets[whichEdit()]["continueAsPlanned"][3] == "continue")?("rgba(40,100,40,0.7)"):("")}} onClick={(e)=>{targets[whichEdit()]["continueAsPlanned"][3] = "continue"; reset();}}>Continue</button><button style={{backgroundColor: (targets[whichEdit()]["continueAsPlanned"][3].includes("divert"))?("rgba(40,100,40,0.7)"):("")}} className="divertConditional">Divert to <input type="number" className="divertInputConditional" onChange={(e)=>{targets[whichEdit()]["continueAsPlanned"][3] = "divert"+document.getElementById("dive4").value;}} placeholder={(targets[whichEdit()]["continueAsPlanned"][3].includes("divert"))?(parseInt(targets[whichEdit()]["continueAsPlanned"][3].replace("divert", ""))):(0)} id="dive4" onBlur={(e)=>{reset();}} onSubmit={(e)=>{e.preventDefault(); reset();}}></input></button><button className="shootConditional" style={{backgroundColor: (targets[whichEdit()]["continueAsPlanned"][3] == "shoot")?("rgba(40,100,40,0.7)"):("")}} onClick={(e)=>{targets[whichEdit()]["continueAsPlanned"][3] = "shoot"; reset();}}>Shoot</button>
      </div>):("")}</p></center></div>
      </center>
      <center style={{position:"absolute", top:"0px", right: "0px", marginTop: "11%", width: (window.screen.width-900)/2}}>
      <table>
        <tr>
          <th>Pose1</th>
          <th>Pose2</th>
          <th>Delay</th>
          <th>Time</th>
        </tr>
        {trajectories?.map((data)=> {
            if(data.end.x > 0){
              if(targets[data.id]["delay"] > 0){totalTime += Math.round((distance(data.start.x, data.start.y, data.end.x, data.end.y, data.translation)*2/7.6)*100)/100 + parseFloat(targets[data.id]["delay"]);}
              else{totalTime += Math.round((distance(data.start.x, data.start.y, data.end.x, data.end.y, data.translation)*2/7.6)*100)/100}
              return(
                <tr>
                <td>{Math.round(data.start.x*100)/100 + ", " + Math.round(data.start.y*100)/100}</td>
                <td>{Math.round(data.end.x*100)/100 + ", " + Math.round(data.end.y*100)/100}</td>
                <td><input id={"delay" + data.id} type="number" min="0" style={{width: "50px", border: "0px", color: "lightgreen", textAlign: "center", backgroundColor: "rgba(0,0,0,0)", fontSize: "15px"}} onChange={(e)=> {targets[data.id]["delay"] = document.getElementById("delay" + data.id).value;}} placeholder={targets[data.id]["delay"]}></input></td>
                <td>{Math.round((distance(data.start.x, data.start.y, data.end.x, data.end.y, data.translation)*2/7.6)*100)/100}</td>
              </tr>
              )
            }
        })}
      </table>
      <p key={"dt" + seed} style={{backgroundColor: "rgba(0,0,0,0)"}}>Drive Time: {Math.round(totalTime*100)/100} seconds</p>
      <br></br>
      <button id="copy" onClick={(e)=>{if(name != ""){document.querySelector("textarea").select();
        document.execCommand('copy');} else{alert("No Auto Name Set");} }} style={{paddingLeft: "15px", paddingRight: "15px", paddingTop: "10px", paddingBottom: "10px", float: "center", border: "2px solid lightgreen", color: "lightgreen", borderRadius: "5px", backgroundColor: "#0f0f10", cursor: "pointer"}}>Copy Code</button>
      <button id="paste" onClick={(e)=>{wpaste().then(txt =>{document.getElementById("codeOutput").value = txt.txt; displayProg();});}} style={{paddingLeft: "15px", paddingRight: "15px", marginLeft: "15px", float: "center", paddingTop: "10px", paddingBottom: "10px", border: "2px solid lightgreen", color: "lightgreen", borderRadius: "5px", backgroundColor: "#0f0f10", cursor: "pointer"}}>Paste Code</button>
      <br></br><br></br>
      <textarea id="codeOutput" cols="0" rows="0" onChange={(e)=>{displayProg();}} style={{resize: "none", height: "0px", width: "0px", color: "rgba(0,0,0,0)", border: "0px", overflow: "hidden"}}></textarea>
      </center>
      <center>{(targets.length > 0 && !name.includes(" (red)") && !name.includes(" (blue)"))?(<p>Your auto seems to be for the <span style={{color:(targets[0]?.x < 8.2)?("blue"):("red")}}>{(targets[0]?.x < 8.2)?("blue"):("red")}</span> alliance. Do you want to see this auton for the <span style={{color: (targets[0]?.x >= 8.2)?("blue"):("red")}}>{(targets[0]?.x >= 8.2)?("blue"):("red")}</span> alliance? <button style={{backgroundColor: "rgba(0,0,0,0)", border: "2px solid lightgreen", color: "lightgreen", borderRadius: "5px", cursor: "pointer"}} onClick={(e)=>{setName(name + ` (${(targets[0]?.x < 8.2)?("red"):("blue")})`); (targets[0]?.x >= 8.2)?(setTargets(redToBlue(targets))):(setTargets(blueToRed(targets)))}}>Yes</button></p>):("")}</center>
      <div className="filebar" style={{position: "absolute", bottom: "0px", width: "100%", minWidth: "100%", whiteSpace: "nowrap", overflowX: "scroll", overflowY: "hidden", height: "34px", backgroundColor: "#444", float: "none"}}>
      <div style={{borderRight: "1px solid grey", float: "none", display: "inline-block", marginTop: "6px", paddingLeft: "15px", paddingRight: "15px", cursor: "pointer"}} onClick={(e)=>{document.getElementById("codeOutput").value = `[]]`; setTargets([]); setTrajectories([]); setName(""); reset();}}>+</div>
        {files?.map((data) =>{
          return(
            <div style={{borderRight: "1px solid grey", float: "none", marginTop: "6px", paddingLeft: "15px", paddingRight: "15px", cursor: "pointer", display: "inline-block", color:(name == data.name)?("orange"):("lightgreen")}} onClick={(e)=>{document.getElementById("codeOutput").value = `${data.targets}`; setTargets(data.targets); setName(data.name); setTrajectories([]); reset();}} onContextMenu={(e)=>{e.preventDefault(); let xbool = confirm("Do you want to delete " + data.name + "?"); if(xbool){deleteFile(data.name); reset();}}}>{data.name}</div>
          );
        })}
      </div>
      
      
    </div>
  )
}
