const fs = require("fs");

const json = require("./base.json");

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
const hsl2rgb = (hh, ss, ll, a=1) => {
    const s = ss/100;
    const l = ll/100;
    let max = l + (s * (1 - Math.abs((2 * l) - 1)) / 2);
    let min = l - (s * (1 - Math.abs((2 * l) - 1)) / 2);
    
    let rgb;
    
    //種々のエラー対処
    if(min < 0) min = 0;
    if(max < 0) max = 0;
    let h = hh;
    if( hh >= 360){
        h = hh - 360 * Math.floor(hh/360);
    }else if(hh < 0){
        h = hh - 360 * Math.ceil(hh/360);
    }
    
    
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
    
    if(res[0] < 0 || res[1] < 0 || res[2] < 0 || res[0] > 255 || res[1] > 255 || res[2] > 255)  console.log(hh, ss, ll, res, max, min, i);
    
    return res;
}

//色の変換
const convertColor = (color, layer = {}) => {
  
  const res = {};
  
  //color: ["rgb", r, g, b]形式のみ対応するが、"case"を利用してる場合は、再帰的に探索して置き換える。
  if(color[0] == "rgb"){
    let [h, s, l, a] = rgb2hsl(color[1], color[2], color[3]); 
    
    //変換処理
    [h, s, l, a] = convertColorMain([h, s, l, a], layer);
    
    //rgbに戻して返す。（hが0～360から逸脱していたら、hsl2rgb内で修正される。）
    let [r, g, b, aa] = hsl2rgb(h, s, l, a);
    res.color = ["rgb", r, g, b];
    
    //console.log([r, g, b, aa]);
    
  
  }else if(color[0] == "case"){
    if(!res.color) res.color = [];
    color.forEach( ele => {
      res.color.push(convertColor(ele, layer));
    });
  
  }else{
    //再帰への対応用。色に関係ない配列要素はそのまま返却すると、"case"用にpushされていく。
    res.color = color;
  }
  
  return res.color;
  
}

//変換ルール
const convertColorMain = ([hh, ss, ll, aa], layer = {}) => {
  let [h, s, l, a] = [hh, ss, ll, aa]; //Hは0～360度以内、S,Lは%（0～100）
  
  s = s/2;
  l = l + (100 - l)/2;
  
  return [h, s, l, a];
  
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
      
      const res = convertColor(paint[name], l);
      paint[name] = res;
      
      //何か、加工するならここで
      
      //console.log(paint[name]);
      //console.log("\n");
    }
  
  }
  
  newlayers.push(l);
  
});

json.layers = newlayers;

fs.writeFileSync("style.json", JSON.stringify(json, null, 2));

