import { StrictMode } from "react";
import { createRoot } from "react-dom/client";
import { BrowserRouter } from "react-router-dom";
import App from "./App";
import { AllianceStoreProvider } from "./store/allianceStore";
import { CenterStoreProvider } from "./store/centerStore";
import { OverseasStoreProvider } from "./store/overseasStore";
import { P1StoreProvider } from "./store/p1Store";
import { WorkDemoProvider } from "./work/workDemoStore";
import "./styles.css";

createRoot(document.getElementById("root")!).render(
  <StrictMode>
    <WorkDemoProvider>
      <P1StoreProvider>
        <AllianceStoreProvider>
          <CenterStoreProvider>
            <OverseasStoreProvider>
              <BrowserRouter>
                <App />
              </BrowserRouter>
            </OverseasStoreProvider>
          </CenterStoreProvider>
        </AllianceStoreProvider>
      </P1StoreProvider>
    </WorkDemoProvider>
  </StrictMode>,
);
