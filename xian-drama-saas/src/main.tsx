import { StrictMode } from "react";
import { createRoot } from "react-dom/client";
import { BrowserRouter } from "react-router-dom";
import App from "./App";
import { AllianceStoreProvider } from "./store/allianceStore";
import { CenterStoreProvider } from "./store/centerStore";
import "./styles.css";

createRoot(document.getElementById("root")!).render(
  <StrictMode>
    <AllianceStoreProvider>
      <CenterStoreProvider>
        <BrowserRouter>
          <App />
        </BrowserRouter>
      </CenterStoreProvider>
    </AllianceStoreProvider>
  </StrictMode>,
);
