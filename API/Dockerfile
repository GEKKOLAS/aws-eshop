# syntax=docker/dockerfile:1

FROM mcr.microsoft.com/dotnet/sdk:9.0 AS build
WORKDIR /src

# copy solution and project files first for better layer caching
COPY aws-eshop.sln ./
COPY API/API.csproj API/
COPY Core/Core.csproj Core/
COPY Infrastructure/Infrastructure.csproj Infrastructure/

RUN dotnet restore API/API.csproj

# copy the rest of the source
COPY . .

RUN dotnet publish API/API.csproj -c Release -o /app/publish /p:UseAppHost=false

FROM mcr.microsoft.com/dotnet/aspnet:9.0 AS final
WORKDIR /app
EXPOSE 8080

ENV ASPNETCORE_URLS=http://0.0.0.0:8080 \
    DOTNET_EnableDiagnostics=0

COPY --from=build /app/publish .

ENTRYPOINT ["dotnet", "API.dll"]
