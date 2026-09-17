const bookElement = document.querySelector('#book');
const pages = bookElement.querySelectorAll('.book-page');
const previousButton = document.querySelector('#previous');
const nextButton = document.querySelector('#next');
const pageStatus = document.querySelector('#page-status');
const orientationStatus = document.querySelector('#orientation');
const pageWidth = Number(bookElement.dataset.pageWidth) || 480;
const pageHeight = Number(bookElement.dataset.pageHeight) || 640;
const reducedMotion = window.matchMedia('(prefers-reduced-motion: reduce)');
document.documentElement.style.setProperty('--page-ratio', pageWidth / pageHeight);
const pageFlip = new St.PageFlip(bookElement, {
  width:pageWidth,height:pageHeight,size:'stretch',minWidth:200,maxWidth:480,
  minHeight:266,maxHeight:640,drawShadow:true,flippingTime:900,usePortrait:true,
  startZIndex:10,autoSize:true,maxShadowOpacity:.55,showCover:true,
  mobileScrollSupport:false,clickEventForward:true,useMouseEvents:true,
  swipeDistance:24,showPageCorners:!reducedMotion.matches,disableFlipByClick:false
});
let currentPage=0;
let isTurning=false;
function updateControls(){
  const last=pages.length-1;
  const portrait=pageFlip.getOrientation()==='portrait';
  bookElement.dataset.edge=currentPage===0?'front':currentPage>=last?'back':'inside';
  previousButton.disabled=currentPage===0||isTurning;
  nextButton.disabled=currentPage>=last||isTurning;
  const num=String(currentPage+1).padStart(2,'0');
  pageStatus.textContent=currentPage===0?'封面':currentPage>=last?'封底':portrait?`${num} / 24`:`${num}—${String(currentPage+2).padStart(2,'0')} / 24`;
  document.querySelector('#chapter').textContent=currentPage<3?'光环之后':currentPage<9?'I · RELIC':currentPage<15?'II · FRACTURE':currentPage<17?'III · AFTERIMAGE':currentPage<21?'IV · ASH':'AFTER THE HALO';
  document.querySelector('#progress-fill').style.transform=`scaleX(${(currentPage+1)/pages.length})`;
  document.querySelector('#book-progress').setAttribute('aria-valuenow',String(currentPage+1));
}
function updateOrientation(orientation){
  bookElement.dataset.layout=orientation;
  orientationStatus.textContent=orientation==='portrait'?'单页阅读':'双页展开';
  updateControls();
}
pageFlip.on('flip',event=>{currentPage=Number(event.data);updateControls();});
pageFlip.on('changeState',event=>{isTurning=event.data!=='read';updateControls();});
pageFlip.on('init',event=>updateOrientation(event.data.mode));
pageFlip.on('changeOrientation',event=>updateOrientation(event.data));
pageFlip.loadFromHTML(pages);
updateControls();
const requestedPage=Number(new URLSearchParams(location.search).get('page'));
if(Number.isInteger(requestedPage)&&requestedPage>=0&&requestedPage<pages.length)pageFlip.turnToPage(requestedPage);
function turn(direction){
  if(isTurning)return;
  if(reducedMotion.matches){direction>0?pageFlip.turnToNextPage():pageFlip.turnToPrevPage();}
  else{direction>0?pageFlip.flipNext('bottom'):pageFlip.flipPrev('bottom');}
}
previousButton.addEventListener('click',()=>turn(-1));
nextButton.addEventListener('click',()=>turn(1));
window.addEventListener('keydown',event=>{
  if(event.altKey||event.ctrlKey||event.metaKey||isTurning||/INPUT|SELECT|TEXTAREA/.test(event.target.tagName))return;
  if(event.key==='ArrowLeft'){event.preventDefault();turn(-1);}
  if(event.key==='ArrowRight'||(event.key===' '&&event.target===document.body)){event.preventDefault();turn(1);}
  if(event.key==='Home'){event.preventDefault();pageFlip.turnToPage(0);}
  if(event.key==='End'){event.preventDefault();pageFlip.turnToPage(pages.length-1);}
});
const fullScreenButton=document.querySelector('#fullscreen');
if(!document.fullscreenEnabled){fullScreenButton.hidden=true;}
fullScreenButton.addEventListener('click',async()=>{
  try{if(document.fullscreenElement)await document.exitFullscreen();else await document.documentElement.requestFullscreen();}
  catch{document.querySelector('#reader-message').textContent='当前浏览器未能进入全屏，可以继续正常翻阅。';}
});
document.addEventListener('fullscreenchange',()=>{
  fullScreenButton.setAttribute('aria-label',document.fullscreenElement?'退出全屏':'全屏阅读');
  fullScreenButton.setAttribute('title',document.fullscreenElement?'退出全屏':'全屏阅读');
});
for(const img of bookElement.querySelectorAll('img')){
  img.addEventListener('error',()=>{document.querySelector('#reader-message').textContent='有一页暂时未能载入，请刷新重试，或下载 PDF 阅读。';});
}
