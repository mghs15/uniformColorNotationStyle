const fs = require("fs");

const json = require("./style.json");

const layers = json.layers;


const calcsl = function(max, min) {
    let L = (max + min)/(2*255);
    let total = max + min;
    let S=(max - min)/255;
    if((total <= 0) || (total >= 510)){
        S = 0;
    }else if(total < 255){
        S = (max-min)/(total);
    }else{
        S = (max-min)/(255*2-total);
    }
    let SL = {"s" : S, "l" : L};
    return SL;
}

const rgb2hsl = function(r, g, b, a = 1) {
    let max=0; let middle=0; let min = 0; 
    let h=0; let s=0; let l=0; 
    if((r == g) && (r == b)){
        max = r; middle=b; min = g; 
        h = 0;
        let sl = calcsl(max, min);
        s = sl.s;
        l = sl.l;
    }else if((r <= g) && (r < b)){
        min = r;
        if(g < b){
            middle=g; max = b; 
        }else{ 
            middle=b; max = g; 
        }
        h = 60*((b-g)/(max-min))+180;
        let sl = calcsl(max, min);
        s = sl.s;
        l = sl.l;
    }else if((g <= b) && (g < r)){
        min = g; 
        if(r < b){
            middle=r; max = b; 
        }else{ 
            middle=b; max = r; 
        } 
        h = 60*((r-b)/(max-min))+300;
        let sl = calcsl(max, min);
        s = sl.s;
        l = sl.l;
    }else{
        min = b; 
        if(g < r){
            middle=g; max = r; 
        }else{ 
            middle=r; max = g; 
        }
        h = 60*((g-r)/(max-min))+60;
        let sl = calcsl(max, min);
        s = sl.s;
        l = sl.l;
    }
    
    if(h > 360){
        h = h - 360;
    }else if(h < 0){
        h = h + 360;
    }
    
    const hsl = [ Math.floor(h), Math.floor(s*100), Math.floor(l*100), a ];
    return hsl;
}


//"rgba(r,g,b,a)"などのパース
const parseColorText = function(txt){

  const color = [];
  if( (txt.indexOf("rgba") == 0) || (txt.indexOf("hsla") == 0) ){
    const length = txt.length - 1;
    const type= txt.slice(0, 4);
    txt = txt.slice(5,length );
    const col = txt.split(",");
    
    color.push( type );
    color.push( parseInt(col[0]) );
    color.push( parseInt(col[1]) );
    color.push( parseInt(col[2]) );
    color.push( Number(col[3]) );  
      
  }else{
    const length = txt.length - 1;
    const type= txt.slice(0, 3);
    txt = txt.slice(4,length );
    const col = txt.split(",");
    col.push(1);
    
    color.push( type );
    color.push( parseInt(col[0]) );
    color.push( parseInt(col[1]) );
    color.push( parseInt(col[2]) );
    color.push( Number(col[3]) );    
  }
  
  return color;
}

const convertColorNoteStyle = (c) => {
  
  const buf = {};
  
  //まず、文字列を配列形式に直す。
  if(!Array.isArray(c)){
    buf.color = parseColorText(c);
  }else{
    buf.color = c;
  }
  
  //次に配列の内容に応じて処理。
  const res = separateArrayColor(buf.color);
  
  return res; 
}

const convertColorNoteStyleInCase = (c) => {
  
  const res = [];
  
  c.forEach( ele => {

    if(Array.isArray(ele)){
     //再帰
      res.push(convertColorNoteStyleInCase(ele));
    }else{
      const eleStr = ele + ""; //数字が混入するとmatchの処理がエラーになる。
      if(eleStr.match(/rgb/) || eleStr.match(/hsl/)){
        res.push(convertColorNoteStyle(ele).color);
      }else{
        res.push(ele);
      }
    }
  });
  
  //返却するのは色だけ。
  return res; 
}


const separateArrayColor = (c) => {
  const res = {
    "color": ["test", 1, 1, 1],
    "opacity": ""
  };
  
  if(Array.isArray(c)){
    if(c[0] == "case"){
      res.color = convertColorNoteStyleInCase(c);
    }else if(c[0] == "rgba"){
      const hsl = rgb2hsl(c[1], c[2], c[3]);
      res.color = ["hsl", hsl[0], hsl[1], hsl[2]];
      res.opacity = c[4];
    }else if(c[0] == "hsla"){
      res.color = ["hsl", c[1], c[2], c[3]];
      res.opacity = c[4];
    }else if(c[0] == "rgb"){
      const hsl = rgb2hsl(c[1], c[2], c[3], 1);
      res.color = ["hsl", hsl[0], hsl[1], hsl[2]];
    }else{
      res.color = c;
    }
  
  }
  
  return res;

}


layers.forEach( l => {
  
  const type = l.type;
  const paint = l.paint;
  for(name in paint){
    if(name.match(/-color/)){
      console.log(paint[name]);
      console.log("↓");
      
      const res = convertColorNoteStyle(paint[name]);
      paint[name] = res.color;
      
      const opacityKeyName = type + "-opacity";
      if(res.opacity && !paint[opacityKeyName]){
        paint[opacityKeyName] = res.opacity;
      }
      
      console.log(paint[name]);
      console.log("\n");
    }
  
  }
  
});


