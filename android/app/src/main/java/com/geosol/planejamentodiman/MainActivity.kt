package com.geosol.planejamentodiman

import android.annotation.SuppressLint
import android.app.Activity
import android.content.Intent
import android.net.Uri
import android.os.Bundle
import android.provider.MediaStore
import android.webkit.ValueCallback
import android.webkit.WebChromeClient
import android.webkit.WebSettings
import android.webkit.WebView
import android.webkit.WebViewClient
import androidx.activity.result.contract.ActivityResultContracts
import androidx.appcompat.app.AppCompatActivity
import androidx.core.content.FileProvider
import java.io.File
import java.io.IOException

class MainActivity : AppCompatActivity() {
    private lateinit var webView: WebView
    
    private var fileUploadCallback: ValueCallback<Array<Uri>>? = null
    private var cameraImageUri: Uri? = null

    private val fileChooserLauncher = registerForActivityResult(ActivityResultContracts.StartActivityForResult()) { result ->
        if (result.resultCode == Activity.RESULT_OK) {
            val results = arrayOf<Uri>()
            
            if (result.data == null || result.data?.data == null) {
                // If there is no data, then it must be from camera
                cameraImageUri?.let {
                    fileUploadCallback?.onReceiveValue(arrayOf(it))
                } ?: run {
                    fileUploadCallback?.onReceiveValue(null)
                }
            } else {
                val dataString = result.data?.dataString
                if (dataString != null) {
                    fileUploadCallback?.onReceiveValue(arrayOf(Uri.parse(dataString)))
                } else {
                    fileUploadCallback?.onReceiveValue(null)
                }
            }
        } else {
            fileUploadCallback?.onReceiveValue(null)
        }
        fileUploadCallback = null
    }

    @SuppressLint("SetJavaScriptEnabled")
    override fun onCreate(savedInstanceState: Bundle?) {
        super.onCreate(savedInstanceState)
        
        webView = WebView(this)
        setContentView(webView)

        val settings = webView.settings
        settings.javaScriptEnabled = true
        settings.domStorageEnabled = true
        settings.allowFileAccess = true
        settings.allowContentAccess = true
        
        // Essential configuration for local files loaded via file:///
        settings.allowFileAccessFromFileURLs = true
        settings.allowUniversalAccessFromFileURLs = true
        settings.mediaPlaybackRequiresUserGesture = false

        webView.webViewClient = object : WebViewClient() {
            @Deprecated("Deprecated in Java")
            override fun shouldOverrideUrlLoading(view: WebView?, url: String?): Boolean {
                return false
            }
        }
        
        webView.webChromeClient = object : WebChromeClient() {
            override fun onShowFileChooser(
                webView: WebView?,
                filePathCallback: ValueCallback<Array<Uri>>?,
                fileChooserParams: FileChooserParams?
            ): Boolean {
                fileUploadCallback?.onReceiveValue(null)
                fileUploadCallback = filePathCallback

                var takePictureIntent: Intent? = Intent(MediaStore.ACTION_IMAGE_CAPTURE)
                var photoFile: File? = null
                try {
                    val imageFileName = "JPEG_" + System.currentTimeMillis() + "_"
                    val storageDir = cacheDir
                    photoFile = File.createTempFile(imageFileName, ".jpg", storageDir)
                } catch (ex: IOException) {
                    // Error occurred
                }
                if (photoFile != null) {
                    cameraImageUri = FileProvider.getUriForFile(
                        this@MainActivity,
                        "${packageName}.fileprovider",
                        photoFile
                    )
                    takePictureIntent?.putExtra(MediaStore.EXTRA_OUTPUT, cameraImageUri)
                } else {
                    takePictureIntent = null
                }

                val contentSelectionIntent = Intent(Intent.ACTION_GET_CONTENT)
                contentSelectionIntent.addCategory(Intent.CATEGORY_OPENABLE)
                contentSelectionIntent.type = "image/*"

                val intentArray: Array<Intent> = if (takePictureIntent != null) arrayOf(takePictureIntent) else emptyArray()

                val chooserIntent = Intent(Intent.ACTION_CHOOSER)
                chooserIntent.putExtra(Intent.EXTRA_INTENT, contentSelectionIntent)
                chooserIntent.putExtra(Intent.EXTRA_TITLE, "Tirar Foto ou Anexar")
                chooserIntent.putExtra(Intent.EXTRA_INITIAL_INTENTS, intentArray)

                fileChooserLauncher.launch(chooserIntent)
                return true
            }
        }

        // Load the local static assets entry point
        webView.loadUrl("file:///android_asset/www/index.html")
    }

    @Deprecated("Deprecated in Java")
    override fun onBackPressed() {
        if (webView.canGoBack()) {
            webView.goBack()
        } else {
            super.onBackPressed()
        }
    }
}
