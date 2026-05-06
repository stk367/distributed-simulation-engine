from __future__ import annotations

from collections import defaultdict

from .models import NodeState, RequestState


class RoutingPolicy:
    def select_node(self, nodes: list[NodeState], _requests: dict[str, RequestState]) -> str:
        raise NotImplementedError


class RoundRobinPolicy(RoutingPolicy):
    def __init__(self) -> None:
        self._index = 0

    def select_node(self, nodes: list[NodeState], _requests: dict[str, RequestState]) -> str:
        healthy_nodes = [node for node in nodes if node.healthy and len(node.active_requests) < node.capacity]
        healthy_nodes.sort(key=lambda n: n.node_id)
        if not healthy_nodes:
            raise ValueError("No healthy nodes with available capacity")

        node = healthy_nodes[self._index % len(healthy_nodes)]
        self._index += 1
        return node.node_id


class LeastConnectionsPolicy(RoutingPolicy):
    def select_node(self, nodes: list[NodeState], _requests: dict[str, RequestState]) -> str:
        candidates = [node for node in nodes if node.healthy and len(node.active_requests) < node.capacity]
        if not candidates:
            raise ValueError("No healthy nodes with available capacity")

        candidates.sort(key=lambda n: (len(n.active_requests), n.node_id))
        return candidates[0].node_id


class LatencyAwarePolicy(RoutingPolicy):
    def __init__(self, window_size: int = 20) -> None:
        self.window_size = window_size

    def _score(self, node: NodeState) -> float:
        if not node.latency_window:
            return 0.0
        window = node.latency_window[-self.window_size :]
        return sum(window) / len(window)

    def select_node(self, nodes: list[NodeState], _requests: dict[str, RequestState]) -> str:
        candidates = [node for node in nodes if node.healthy and len(node.active_requests) < node.capacity]
        if not candidates:
            raise ValueError("No healthy nodes with available capacity")

        candidates.sort(key=lambda n: (self._score(n), len(n.active_requests), n.node_id))
        return candidates[0].node_id


def create_policy(policy_name: str, window_size: int) -> RoutingPolicy:
    factories = {
        "round_robin": lambda: RoundRobinPolicy(),
        "least_connections": lambda: LeastConnectionsPolicy(),
        "latency_aware": lambda: LatencyAwarePolicy(window_size=window_size),
    }
    if policy_name not in factories:
        raise ValueError(f"Unsupported policy: {policy_name}")
    return factories[policy_name]()
