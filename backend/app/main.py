from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware

from app.api.replay import router as replay_router
from app.api.stream import router as stream_router
from app.api.traces import router as traces_router
from app.security import SecurityRuntimeConfig, create_security_middleware

app = FastAPI(title="LLM Load Balancer Simulator API", version="0.1.0")
security_config = SecurityRuntimeConfig()

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=False,
    allow_methods=["*"],
    allow_headers=["*"],
)

app.include_router(replay_router)
app.include_router(stream_router)
app.include_router(traces_router)
app.middleware("http")(create_security_middleware(security_config))


@app.get("/health")
def health() -> dict[str, str]:
    return {"status": "ok"}
