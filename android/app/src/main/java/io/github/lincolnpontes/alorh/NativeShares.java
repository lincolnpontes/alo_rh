package io.github.lincolnpontes.alorh;

import android.app.Activity;
import android.content.ClipData;
import android.content.Intent;
import android.net.Uri;
import android.util.Base64;
import androidx.core.content.FileProvider;
import java.io.File;
import java.io.FileOutputStream;
import java.util.concurrent.ExecutorService;

/** Shares only deliberate exports, through temporary read access to one private cache file. */
final class NativeShares {
    interface Result { void finish(boolean ok, String error); }
    private final Activity activity;
    private final ExecutorService worker;
    private boolean preparing;
    NativeShares(Activity activity, ExecutorService worker) {
        this.activity=activity;this.worker=worker;worker.execute(this::cleanup);
    }
    private File directory(){return new File(activity.getCacheDir(),"shared-pdf");}
    private void cleanup(){
        File[] files=directory().listFiles();if(files==null)return;
        long cutoff=System.currentTimeMillis()-24*60*60*1000L;
        for(File file:files)if(file.isFile()&&file.lastModified()<cutoff)file.delete();
    }
    void text(String text){
        if(!NativePolicy.shareText(text))throw new IllegalArgumentException();
        Intent send=new Intent(Intent.ACTION_SEND).setType("text/plain")
            .putExtra(Intent.EXTRA_TEXT,text).putExtra(Intent.EXTRA_TITLE,"Resumo do contracheque");
        activity.startActivity(Intent.createChooser(send,"Compartilhar resumo"));
    }
    void pdf(String base64,String name,Result result){
        if(preparing){result.finish(false,"Aguarde a preparação do PDF anterior.");return;}
        preparing=true;
        worker.execute(()->{
            File output=null;
            try {
                byte[] bytes=Base64.decode(base64,Base64.DEFAULT);
                if(!NativePolicy.pdf(bytes))throw new IllegalArgumentException();
                cleanup();File directory=directory();
                if(!directory.isDirectory()&&!directory.mkdirs())throw new IllegalStateException();
                String safe=NativePolicy.filename(name).replaceFirst("(?i)\\.pdf$","");
                output=File.createTempFile("alorh-"+safe+"-",".pdf",directory);
                try(FileOutputStream stream=new FileOutputStream(output)){stream.write(bytes);stream.flush();}
                final File file=output;
                activity.runOnUiThread(()->{
                    preparing=false;
                    if(activity.isDestroyed()||activity.isFinishing()){file.delete();return;}
                    try {
                        Uri uri=FileProvider.getUriForFile(activity,activity.getPackageName()+".sharedfiles",file);
                        Intent send=new Intent(Intent.ACTION_SEND).setType("application/pdf")
                            .putExtra(Intent.EXTRA_STREAM,uri).addFlags(Intent.FLAG_GRANT_READ_URI_PERMISSION);
                        send.setClipData(ClipData.newRawUri("PDF",uri));
                        activity.startActivity(Intent.createChooser(send,"Compartilhar PDF"));
                        result.finish(true,""); // The chooser opened; no claim that the user sent the file.
                    }catch(Exception error){file.delete();result.finish(false,"Não foi possível abrir o compartilhamento do PDF.");}
                });
            }catch(Exception error){
                if(output!=null)output.delete();
                activity.runOnUiThread(()->{preparing=false;if(!activity.isDestroyed())result.finish(false,"Não foi possível preparar o PDF para compartilhar. Tente novamente.");});
            }
        });
    }
}
