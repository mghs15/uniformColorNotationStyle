const fs = require("fs");

const json = require("./input.json");

const layers = json.layers;

//rgbをhslへ変換
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

//hslをrgbへ変換
const hsl2rgb = (h, ss, ll, a=1) => {
    const s = ss/100;
    const l = ll/100;
    const max = l + (s * (1 - Math.abs((2 * l) - 1)) / 2);
    const min = l - (s * (1 - Math.abs((2 * l) - 1)) / 2);

    let rgb;
    const i = parseInt(h / 60);

    switch (i) {
      case 0:
      case 6:
        rgb = [max, min + (max - min) * (h / 60), min];
        break;
      case 1:
        rgb = [min + (max - min) * ((120 - h) / 60), max, min];
        break;
      case 2:
        rgb = [min, max, min + (max - min) * ((h - 120) / 60)];
        break;
      case 3:
        rgb = [min, min + (max - min) * ((240 - h) / 60), max];
        break;
      case 4:
        rgb = [min + (max - min) * ((h - 240) / 60), min, max];
        break;
      case 5:
        rgb = [max, min, min + (max - min) * ((360 - h) / 60)];
        break;
    }
    
    const res = [Math.floor(rgb[0]*255), Math.floor(rgb[1]*255), Math.floor(rgb[2]*255), a];
    return res;
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
    
    color.push( type + "a" );
    color.push( parseInt(col[0]) );
    color.push( parseInt(col[1]) );
    color.push( parseInt(col[2]) );
    color.push( Number(col[3]) );    
  }
  
  
  return color;
}


//配列形式の色記述を透過度なしの["rgb", r, g, b]形式へ統一。ついでに透過度も別途返す。
const separateArrayColor = (c) => {
  const res = {
    "color": ["test", 1, 1, 1],
    "opacity": ""
  };
  
  if(Array.isArray(c)){
    if(c[0] == "case"){
      res.color = convertColorNoteStyleInCase(c);
    }else if(c[0] == "rgba"){
      res.color = ["rgb", c[1], c[2], c[3]];
      res.opacity = c[4];
    }else{
      res.color = c;
    }
  
  }
  

  return res;

}

//["case", ...]形式の記述に含まれるcolorのスタイル記述を変換。（透過度は無視）
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

//colorのスタイル記述を["hsl", s, s, l]形式へ統一。ついでに透過度も返す。
const convertColorNoteStyle = (c) => {
  
  const buf = {};
  
  //まず、文字列を配列形式に直す。
  if(!Array.isArray(c)){
    buf.color = parseColorText(c);
    
    //ここでhslをrgbへ変換して、以降はRGBで取り扱う
    if(buf.color[0] == "hsla"){
      const rgb = hsl2rgb(buf.color[1], buf.color[2], buf.color[3], buf.color[4])
      buf.color = ["rgba", ...rgb];
      //console.log(rgb);
    }
    
    
  }else{
    buf.color = c;
  }
  
  //次に配列の内容に応じて処理。
  const res = separateArrayColor(buf.color);
  
  return res; 
}

//（実行）レイヤごとに、convertColorNoteStyle()を適用。
const newlayers = [];
layers.forEach( l => {
  
  const type = l.type;
  const paint = l.paint;
  for(name in paint){
    if(name.match(/-color/)){
      //console.log(paint[name]);
      //console.log("↓");
      
      const res = convertColorNoteStyle(paint[name]);
      paint[name] = res.color;
      
      //何か、加工するならここで
      
      const opacityKeyName = type + "-opacity";
      if(res.opacity && type != "symbol"){
        if(!Object.keys(paint).includes(opacityKeyName)){ //opacity=0のときに代入されてしまうのを防ぐ
          paint[opacityKeyName] = res.opacity;
        }
      }
      
      //console.log(paint[name]);
      //console.log("\n");
    }
  
  }
  
  newlayers.push(l);
  
});

json.layers = newlayers;

fs.writeFileSync("base.json", JSON.stringify(json, null, 2));

