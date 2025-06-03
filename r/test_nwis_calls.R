library(dataRetrieval)
library(ggplot2)
library(lubridate)



siteNumber <- "09058000"
parameterCd <- "00060" # Discharge
statCd <- "00080"
startDate <- "1995-07-16"
endDate <- "2023-07-16"


discharge <- readNWISdv(siteNumber, parameterCd, startDate, endDate, statCd = statCd)

discharge_stats <- readNWISstat(
  siteNumbers = siteNumber,
  parameterCd = parameterCd,
  statReportType = "daily",
  statType = "median"
)

discharge_stats$date <- paste0('2024-', discharge_stats$month_nu, '-', discharge_stats$day_nu)
discharge_stats$date <- as.Date(discharge_stats$date, format="%Y-%m-%d")
discharge_stats$doy <- yday(discharge_stats$date)


ggplot() +
  geom_line(data=discharge_stats, aes(x=doy, y=p50_va))

attr(discharge_stats, "url")
names(attributes(discharge_stats))

#  Get for all stations of interest and write this data directly as a JSON obj
# that is brought into the website as a static file to compare... otherwise you
# are doing a tricky tab-delimited file conversion on the fly using JS,
# which isn't a great workflow... median values are changing much to where it matters

# max sites allowable in this call is 10, so breaking it into two calls and combining data

sites1 <- c(
  "09058000", # colorado river at kremmling
  "09060799", # colorado river at catamount
  "09070500", # colorado river blw dotsero,
  "09066325", # gore creek abv red sandstone creek
  "09066510", # gore creek at mouth
  "09061600" # east fork Eagle River near climax,
)


sites2 <- c(
  "09063000", # eagle river at redcliff
  "09064000", # eagle river at homestake cr
  "09064600", # eagle river abv minturn
  "09067020", # eagle river blw wwtp avon
  "394220106431500", # eagle river blw milk cr nr wolcott
  "09070000" # eagle river at gypsum
)


# make the webservice call
parameterCd <- "00060" # Discharge
statCd <- "00080"  # median

flows1 <- readNWISstat(
  siteNumbers = sites1,
  parameterCd = parameterCd,
  statReportType = "daily",
  statType = "median"
)

flows2 <- readNWISstat(
  siteNumbers = sites2,
  parameterCd = parameterCd,
  statReportType = "daily",
  statType = "median"
)

attr(flows1, "url")
attr(flows2, "url")
names(attributes(flows1))

med_flows <- rbind(flows1, flows2)


# build a column with day-of-year (julian date) for plotting)
med_flows$date <- paste0('2024-', med_flows$month_nu, '-', med_flows$day_nu)
med_flows$date <- as.Date(med_flows$date, format="%Y-%m-%d")
med_flows$doy <- yday(med_flows$date)

ggplot(med_flows)+
  geom_line(aes(x=doy, y=p50_va, color=site_no))

unique(med_flows$site_no)

ggplot(med_flows)+
  geom_histogram(aes(count_nu), binwidth=5)

# subset a few columns to use in the website and write to file
df <- med_flows[c("site_no", "p50_va",  "date", "doy")]
df$date <- format(as.Date(df$date), "%m-%d")

names(df) <- c("siteID", "medianFlow", "monthDay", "doy")


library(jsonlite)
dfjson <- toJSON(df)
cat(x)


toJSON(df, dataframe = "rows")
toJSON(df, dataframe = "columns")
toJSON(df, dataframe = "values")

toJSON(setNames(object = as.list(df$medianFlow, df$monthDay), nm=df$siteID),  auto_unbox = TRUE)


toJSON(setNames(as.list(gscSocial$totalReach), gscSocial$Date),  auto_unbox = TRUE)



library(jsonlite)
library(purrr)
map(split(df, df$siteID), toJSON)
names(lst1) <- paste0('group', names(lst1))
toJSON(lst1)

library(tidyr)
library(tibble)
library(dplyr)
library(tidyjson)

 df %>% group_by(siteID) %>% toJSON


toJSON(df_wide)
nested_df$siteID
li
  
  
  
#  gather the dataframe to wideform in which each column represents a site and each row value is the daily median value
df_wide <- pivot_wider(df, names_from=siteID, values_from=medianFlow )
wideJSON <- toJSON(df_wide[3:14], dataframe="columns")
write(wideJSON, "medianFlows.json")

# testing
day = 200

for(day in unique(df$doy)){
  # select all rows for that day of year (each gauge site should have one row)
  print(paste('day of year:', day))
  filtered_df <- df[df$doy==day,]
  for(site in unique(filtered_df$siteID)){
    json_substr <- cat("\"", site, "\": \"", filtered_df$medianFlow[filtered_df$siteID==site],"\"", sep="")
   
    obj_str <- cat("{",json_substr,"}", sep="")
    print(obj_str)
  }
  
  json_str <- toJSON( df[c("siteID", "medianFlow")][df$doy==day,] )
  print(json_str)
}
