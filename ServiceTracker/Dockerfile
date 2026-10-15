FROM --platform=$BUILDPLATFORM mcr.microsoft.com/dotnet/sdk:8.0 AS build
ARG TARGETARCH
WORKDIR /source

COPY --link src/ServiceTracker.Api/*.csproj src/ServiceTracker.Api/
COPY --link src/ServiceTracker.Contracts/*.csproj src/ServiceTracker.Contracts/

RUN dotnet restore -a $TARGETARCH src/ServiceTracker.Api/ServiceTracker.Api.csproj

COPY --link . .
RUN dotnet publish -a $TARGETARCH -o /app src/ServiceTracker.Api/ServiceTracker.Api.csproj

FROM mcr.microsoft.com/dotnet/aspnet:8.0

WORKDIR /app
COPY --link --from=build /app .
USER $APP_UID
ENTRYPOINT ["./ServiceTracker.Api"]
