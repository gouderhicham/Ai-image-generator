import React, { useRef, useState } from "react";
import "./App.css";
import placeholderImg from "./assets/placeholder.png";

const App = () => {
  const [imageUrl, setImageUrl] = useState("/");
  const [loading, setLoading] = useState(false);
  let inputRef = useRef(null);

  const imageGenerator = async () => {
    setLoading(true);
    try {
      if (inputRef.current.value === "") return 0;

      // Step 1: Submit the prediction
      const response = await fetch(
        "https://router.huggingface.co/wavespeed/api/v3/wavespeed-ai/z-image/turbo",
        {
          headers: {
            Authorization: `Bearer ${import.meta.env.VITE_HF_TOKEN}`,
            "Content-Type": "application/json",
          },
          method: "POST",
          body: JSON.stringify({
            prompt: inputRef.current.value,
          }),
        }
      );

      const data = await response.json();
      console.log("Prediction created:", data);

      if (!data.data || !data.data.urls || !data.data.urls.get) {
        throw new Error("No result URL returned: " + JSON.stringify(data));
      }

      const resultUrl = data.data.urls.get.replace(
        "https://api.wavespeed.ai",
        "https://router.huggingface.co/wavespeed"
      );

      // Step 2: Poll for the result until the image is ready
      let imageResult = null;
      for (let i = 0; i < 30; i++) {
        await new Promise((resolve) => setTimeout(resolve, 2000));

        const pollResponse = await fetch(resultUrl, {
          headers: {
            Authorization: `Bearer ${import.meta.env.VITE_HF_TOKEN}`,
          },
        });

        const pollData = await pollResponse.json();
        console.log(`Poll attempt ${i + 1}:`, pollData.data?.status);

        if (pollData.data?.status === "completed" && pollData.data?.outputs?.length > 0) {
          imageResult = pollData.data.outputs[0];
          break;
        }

        if (pollData.data?.status === "failed") {
          throw new Error("Image generation failed: " + (pollData.data?.error || "unknown error"));
        }
      }

      if (!imageResult) {
        throw new Error("Timed out waiting for image generation");
      }

      console.log("Image URL:", imageResult);

      if (imageUrl && imageUrl !== "/") {
        URL.revokeObjectURL(imageUrl);
      }

      setImageUrl(imageResult);
    } catch (err) {
      console.log("error from the apis", err);
    } finally {
      setLoading(false);
    }
  };

  const handleKeyDown = (e) => {
    if (e.key === "Enter" && !loading) {
      imageGenerator();
    }
  };

  return (
    <div className="container">
      <div className="header">
        <h1>
          AI Image <span>Generator</span>
        </h1>
        <p>Transform your ideas into stunning visuals with AI</p>
      </div>

      <div className="image-card">
        {loading ? (
          <div className="loader-wrapper">
            <div className="spinner" />
            <p className="loader-text">Creating your masterpiece...</p>
          </div>
        ) : (
          <img
            src={imageUrl === "/" ? placeholderImg : imageUrl}
            alt="AI Generated"
            id="generated-image"
          />
        )}
      </div>

      <div className="input-section">
        <input
          ref={inputRef}
          type="text"
          placeholder="Describe the image you want to create..."
          onKeyDown={handleKeyDown}
          disabled={loading}
          id="prompt-input"
        />
        <button
          onClick={imageGenerator}
          type="button"
          disabled={loading}
          id="generate-btn"
        >
          <span>{loading ? "Generating..." : "Generate"}</span>
        </button>
      </div>

      <p className="powered-by">
        Powered by <strong>WaveSpeed AI</strong>
      </p>
    </div>
  );
};

export default App;
