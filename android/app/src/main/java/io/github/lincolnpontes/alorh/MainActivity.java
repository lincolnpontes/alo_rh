package io.github.lincolnpontes.alorh;

import android.app.AlertDialog;
import android.content.Intent;
import android.graphics.Color;
import android.net.Uri;
import android.os.Bundle;
import android.util.Base64;
import android.webkit.*;
import android.widget.FrameLayout;
import android.widget.Toast;
import androidx.activity.ComponentActivity;
import androidx.activity.OnBackPressedCallback;
import androidx.core.graphics.Insets;
import androidx.core.view.ViewCompat;
import androidx.core.view.WindowInsetsCompat;
import androidx.webkit.*;
import org.json.JSONObject;
import java.io.ByteArrayInputStream;
import java.io.OutputStream;
import java.util.Collections;
import java.util.concurrent.ExecutorService;
import java.util.concurrent.Executors;

/** Packaged local UI, as in Alô Cozinha; the existing Apps Script remains the backend. */
public final class MainActivity extends ComponentActivity {
    private static final int OPEN_FILE = 41, SAVE_FILE = 42;
    private WebView web;
    private NativeShares shares;
    private ValueCallback<Uri[]> fileCallback;
    private byte[] pendingFile;
    private JavaScriptReplyProxy pendingReply;
    private String pendingId;
    private final ExecutorService files = Executors.newSingleThreadExecutor();

    @Override public void onCreate(Bundle state) {
        super.onCreate(state);
        shares=new NativeShares(this,files);
        FrameLayout root = new FrameLayout(this);
        root.setBackgroundColor(Color.rgb(0,105,92));
        ViewCompat.setOnApplyWindowInsetsListener(root,(view,insets)-> {
            Insets bars = insets.getInsets(WindowInsetsCompat.Type.systemBars() | WindowInsetsCompat.Type.displayCutout() | WindowInsetsCompat.Type.ime());
            view.setPadding(bars.left,bars.top,bars.right,bars.bottom); return insets;
        });
        web = new WebView(this);
        web.setBackgroundColor(Color.rgb(240,242,245));
        root.addView(web,new FrameLayout.LayoutParams(-1,-1));setContentView(root);
        WebView.setWebContentsDebuggingEnabled(false);
        WebSettings settings=web.getSettings();
        settings.setJavaScriptEnabled(true);settings.setDomStorageEnabled(true);
        settings.setAllowFileAccess(false);settings.setAllowContentAccess(true);
        settings.setMixedContentMode(WebSettings.MIXED_CONTENT_NEVER_ALLOW);
        settings.setSupportMultipleWindows(false);
        CookieManager.getInstance().setAcceptThirdPartyCookies(web,false);
        final WebViewAssetLoader loader=new WebViewAssetLoader.Builder()
            .addPathHandler("/assets/",new WebViewAssetLoader.AssetsPathHandler(this)).build();
        web.setWebViewClient(new WebViewClientCompat(){
            @Override public WebResourceResponse shouldInterceptRequest(WebView view,WebResourceRequest request){
                Uri uri=request.getUrl();
                if("appassets.androidplatform.net".equals(uri.getHost())) {
                    if(!NativePolicy.internal(uri.toString()))return blocked();
                    WebResourceResponse response=loader.shouldInterceptRequest(uri);
                    return response==null?blocked():response;
                }
                // Only Apps Script transport (including its response redirect) can use the network.
                String host=uri.getHost();
                if("https".equals(uri.getScheme()) && ("script.google.com".equals(host)||"script.googleusercontent.com".equals(host)))return null;
                return blocked();
            }
            @Override public boolean shouldOverrideUrlLoading(WebView view,WebResourceRequest request){
                if(request.isForMainFrame()&&NativePolicy.internal(request.getUrl().toString()))return false;
                if(request.isForMainFrame())openExternal(request.getUrl().toString());return true;
            }
        });
        web.setWebChromeClient(new WebChromeClient(){
            @Override public boolean onJsAlert(WebView view,String url,String message,JsResult result){
                new AlertDialog.Builder(MainActivity.this).setTitle("Alô RH").setMessage(message)
                    .setPositiveButton("OK",(dialog,which)->result.confirm()).setOnCancelListener(dialog->result.cancel()).show();return true;
            }
            @Override public boolean onJsConfirm(WebView view,String url,String message,JsResult result){
                new AlertDialog.Builder(MainActivity.this).setTitle("Alô RH").setMessage(message)
                    .setPositiveButton("Confirmar",(dialog,which)->result.confirm()).setNegativeButton("Cancelar",(dialog,which)->result.cancel())
                    .setOnCancelListener(dialog->result.cancel()).show();return true;
            }
            @Override public boolean onShowFileChooser(WebView view,ValueCallback<Uri[]> callback,FileChooserParams params){
                if(fileCallback!=null)fileCallback.onReceiveValue(null);fileCallback=callback;
                try { Intent intent=params.createIntent();intent.addCategory(Intent.CATEGORY_OPENABLE);startActivityForResult(intent,OPEN_FILE); }
                catch(Exception e){fileCallback=null;callback.onReceiveValue(null);message("Não foi possível abrir o seletor de arquivos.");}return true;
            }
        });
        if(!WebViewFeature.isFeatureSupported(WebViewFeature.WEB_MESSAGE_LISTENER)) {
            new AlertDialog.Builder(this).setTitle("Atualize o Android System WebView")
                .setMessage("O componente de navegação do Android precisa ser atualizado para abrir o Alô RH.")
                .setPositiveButton("Fechar",(dialog,which)->finish()).setCancelable(false).show();return;
        }
        // Unlike a generic JavascriptInterface, this channel is restricted to the packaged origin and main frame.
        if(WebViewFeature.isFeatureSupported(WebViewFeature.WEB_MESSAGE_LISTENER))WebViewCompat.addWebMessageListener(web,"AloRHNative",Collections.singleton(NativePolicy.ORIGIN),(view,message,origin,mainFrame,reply)->{
            if(!mainFrame||!NativePolicy.ORIGIN.equals(origin.toString())||!NativePolicy.internal(view.getUrl()))return;
            try {
                String data=message.getData();if(data==null||data.length()>NativePolicy.MAX_BYTES*2)throw new IllegalArgumentException();
                JSONObject value=new JSONObject(data);String id=value.optString("id");
                switch(value.getString("action")){
                    case "external":openExternal(value.getString("url"));break;
                    case "share-pdf":shares.pdf(value.getString("base64"),value.getString("name"),(ok,error)->reply(reply,id,ok,error));break;
                    case "share-text":shares.text(value.getString("text"));break;
                    case "save":save(value,id,reply);break;
                    default:throw new IllegalArgumentException();
                }
            }catch(Exception e){message("Não foi possível concluir a operação no Android.");}
        });
        getOnBackPressedDispatcher().addCallback(this,new OnBackPressedCallback(true){
            @Override public void handleOnBackPressed(){
                web.evaluateJavascript("window.RHAndroid && window.RHAndroid.back()",handled->{if(!"true".equals(handled))moveTaskToBack(true);});
            }
        });
        web.loadUrl(NativePolicy.ORIGIN+"/assets/index.html");
    }
    private static WebResourceResponse blocked(){return new WebResourceResponse("text/plain","UTF-8",403,"Blocked",Collections.emptyMap(),new ByteArrayInputStream(new byte[0]));}
    private void message(String text){Toast.makeText(this,text,Toast.LENGTH_LONG).show();}
    private void openExternal(String url){
        if(!NativePolicy.external(url))return;
        try { startActivity(new Intent(Intent.ACTION_VIEW,Uri.parse(url)).addCategory(Intent.CATEGORY_BROWSABLE)); }
        catch(Exception ignored){message("Não há aplicativo disponível para abrir esse link.");}
    }
    private void reply(JavaScriptReplyProxy proxy,String id,boolean ok,String error){
        if(WebViewFeature.isFeatureSupported(WebViewFeature.WEB_MESSAGE_LISTENER))try{proxy.postMessage(new JSONObject().put("id",id).put("ok",ok).put("error",error).toString());}catch(Exception ignored){}
    }
    private void save(JSONObject data,String id,JavaScriptReplyProxy proxy)throws Exception{
        if(pendingFile!=null){reply(proxy,id,false,"Conclua o arquivo anterior primeiro.");return;}
        byte[] bytes=Base64.decode(data.getString("base64"),Base64.DEFAULT);
        if(bytes.length>NativePolicy.MAX_BYTES){reply(proxy,id,false,"Arquivo maior que 8 MB.");return;}
        String name=NativePolicy.filename(data.getString("name"));
        String mime=name.endsWith(".json")?"application/json":name.endsWith(".xlsx")?"application/vnd.openxmlformats-officedocument.spreadsheetml.sheet":"application/octet-stream";
        pendingFile=bytes;pendingReply=proxy;pendingId=id;
        try{startActivityForResult(new Intent(Intent.ACTION_CREATE_DOCUMENT).addCategory(Intent.CATEGORY_OPENABLE).setType(mime).putExtra(Intent.EXTRA_TITLE,name),SAVE_FILE);}
        catch(Exception error){pendingFile=null;pendingReply=null;pendingId=null;reply(proxy,id,false,"Não foi possível abrir o seletor de destino.");}
    }
    @Override protected void onActivityResult(int request,int result,Intent data){
        super.onActivityResult(request,result,data);
        if(request==OPEN_FILE&&fileCallback!=null){fileCallback.onReceiveValue(WebChromeClient.FileChooserParams.parseResult(result,data));fileCallback=null;}
        if(request==SAVE_FILE&&pendingFile!=null){
            byte[] bytes=pendingFile;JavaScriptReplyProxy proxy=pendingReply;String id=pendingId;
            pendingFile=null;pendingReply=null;pendingId=null;
            Uri destination=data==null?null:data.getData();
            if(result!=RESULT_OK||destination==null){reply(proxy,id,true,"");return;}
            files.execute(()->{
                try(OutputStream stream=getContentResolver().openOutputStream(destination,"wt")){
                    if(stream==null)throw new IllegalStateException();stream.write(bytes);stream.flush();
                    runOnUiThread(()->reply(proxy,id,true,""));
                }catch(Exception error){runOnUiThread(()->reply(proxy,id,false,"Não foi possível salvar o arquivo. Tente novamente."));}
            });
        }
    }
    @Override protected void onResume(){super.onResume();if(web!=null)web.evaluateJavascript("window.dispatchEvent(new Event('online'))",null);}
    @Override protected void onDestroy(){
        if(fileCallback!=null)fileCallback.onReceiveValue(null);
        if(web!=null)web.destroy();files.shutdown();super.onDestroy();
    }
}
