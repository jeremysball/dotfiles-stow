"""Serper API client for Google Search."""

import os
from typing import Any

import requests
from dotenv import load_dotenv

# Load .env if present
load_dotenv()


class SerperClient:
    """Client for Serper.dev Google Search API."""

    BASE_URL = "https://google.serper.dev"

    def __init__(self, api_key: str | None = None):
        """
        Initialize the Serper client.

        Args:
            api_key: Serper API key. If not provided, uses SERPER_API_KEY env var.
        """
        self.api_key = api_key or os.getenv("SERPER_API_KEY")
        if not self.api_key:
            raise ValueError(
                "SERPER_API_KEY not found. Set the environment variable or pass api_key parameter."
            )

    def _request(
        self,
        endpoint: str,
        query: str,
        num: int = 10,
        page: int = 1,
        gl: str = "us",
        hl: str = "en",
        location: str | None = None,
        **kwargs: Any,
    ) -> dict[str, Any]:
        """Make a request to the Serper API."""
        url = f"{self.BASE_URL}/{endpoint}"

        payload = {
            "q": query,
            "num": num,
            "page": page,
            "gl": gl,
            "hl": hl,
            **kwargs,
        }

        if location:
            payload["location"] = location

        headers = {
            "X-API-KEY": self.api_key,
            "Content-Type": "application/json",
        }

        response = requests.post(url, json=payload, headers=headers, timeout=30)
        response.raise_for_status()
        return response.json()

    def search(
        self,
        query: str,
        num: int = 10,
        page: int = 1,
        gl: str = "us",
        hl: str = "en",
        location: str | None = None,
    ) -> dict[str, Any]:
        """
        Perform a web search.

        Args:
            query: Search query
            num: Number of results (max 100)
            page: Page number for pagination
            gl: Country code (e.g., "us", "uk", "de")
            hl: Language code (e.g., "en", "es", "fr")
            location: Specific location for local search

        Returns:
            Search results as dict with organic, knowledgeGraph, relatedSearches, etc.
        """
        return self._request("search", query, num, page, gl, hl, location)

    def news(
        self,
        query: str,
        num: int = 10,
        gl: str = "us",
        hl: str = "en",
    ) -> dict[str, Any]:
        """
        Search for news articles.

        Args:
            query: Search query
            num: Number of results
            gl: Country code
            hl: Language code

        Returns:
            News results as dict with "news" key containing article list
        """
        return self._request("news", query, num, gl=gl, hl=hl)

    def images(
        self,
        query: str,
        num: int = 10,
        gl: str = "us",
        hl: str = "en",
    ) -> dict[str, Any]:
        """
        Search for images.

        Args:
            query: Search query
            num: Number of results
            gl: Country code
            hl: Language code

        Returns:
            Image results as dict with "images" key containing image list
        """
        return self._request("images", query, num, gl=gl, hl=hl)

    def videos(
        self,
        query: str,
        num: int = 10,
        gl: str = "us",
        hl: str = "en",
    ) -> dict[str, Any]:
        """
        Search for videos.

        Args:
            query: Search query
            num: Number of results
            gl: Country code
            hl: Language code

        Returns:
            Video results as dict
        """
        return self._request("videos", query, num, gl=gl, hl=hl)
