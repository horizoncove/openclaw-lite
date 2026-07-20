"""Persisted network settings for market data and AI agent."""

from __future__ import annotations

from dataclasses import dataclass

from PyQt6.QtCore import QSettings


ORG = "Sharon"
APP = "TradingSystem"


@dataclass
class NetworkSettings:
    market_enabled: bool = True
    market_interval_sec: int = 15
    agent_enabled: bool = False
    agent_base_url: str = "https://api.deepseek.com/v1"
    agent_api_key: str = ""
    agent_model: str = "deepseek-chat"

    def masked_api_key(self) -> str:
        key = self.agent_api_key.strip()
        if len(key) <= 8:
            return "*" * len(key)
        return f"{key[:3]}…{key[-4:]}"


def load_network_settings(settings: QSettings | None = None) -> NetworkSettings:
    store = settings or QSettings(ORG, APP)
    return NetworkSettings(
        market_enabled=bool(store.value("network/market_enabled", True, type=bool)),
        market_interval_sec=max(
            5,
            int(store.value("network/market_interval_sec", 15, type=int) or 15),
        ),
        agent_enabled=bool(store.value("network/agent_enabled", False, type=bool)),
        agent_base_url=str(
            store.value(
                "network/agent_base_url",
                "https://api.deepseek.com/v1",
                type=str,
            )
            or "https://api.deepseek.com/v1"
        ),
        agent_api_key=str(store.value("network/agent_api_key", "", type=str) or ""),
        agent_model=str(
            store.value("network/agent_model", "deepseek-chat", type=str)
            or "deepseek-chat"
        ),
    )


def save_network_settings(
    config: NetworkSettings, settings: QSettings | None = None
) -> None:
    store = settings or QSettings(ORG, APP)
    store.setValue("network/market_enabled", bool(config.market_enabled))
    store.setValue(
        "network/market_interval_sec", max(5, int(config.market_interval_sec))
    )
    store.setValue("network/agent_enabled", bool(config.agent_enabled))
    store.setValue("network/agent_base_url", config.agent_base_url.strip())
    store.setValue("network/agent_api_key", config.agent_api_key.strip())
    store.setValue("network/agent_model", config.agent_model.strip() or "deepseek-chat")
    store.sync()


__all__ = [
    "NetworkSettings",
    "load_network_settings",
    "save_network_settings",
]
