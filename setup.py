from setuptools import find_packages, setup

with open("requirements.txt", encoding="utf-8") as f:
    requirements = [
        line.strip()
        for line in f.readlines()
        if line.strip() and not line.strip().startswith("#")
    ]

setup(
    name="pitweb",
    version="0.0.1",
    description="Custom ERPNext app for Pitweb",
    author="Pitweb",
    author_email="admin@example.com",
    packages=find_packages(),
    include_package_data=True,
    zip_safe=False,
    install_requires=requirements,
)
