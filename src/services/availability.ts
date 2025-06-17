import moment from "moment";

export async function availabilitySettings(results: any, toolCall: any) {
    const tomorrow_date = moment().add(1, "days").format("YYYY-MM-DD");
    const ten_days = moment().add(11, "days").format("YYYY-MM-DD");
  
    const range = {
      start: {
        date: tomorrow_date,
        time: "04:00:00",
        tz: "Z",
      },
      end: {
        date: ten_days,
        time: "04:00:00",
        tz: "Z",
      },
    };
  
     
    // TODO: Implement availability settings
    const response = {
        unavailabilities: []
    }
  
    // Appointment Dates Available
    const availableDates = [];
    const startDate = moment(tomorrow_date);
  
    for (let i = 0; i < 10; i++) {
      const currentDate = startDate.clone().add(i, "days");
      const dateStr = currentDate.format("YYYY-MM-DD");
  
      const isUnavailable = response.unavailabilities.some(
        (unavail: any) =>
          unavail.date.date === dateStr ||
          moment(dateStr).format("dddd") === unavail.date.date,
      );
  
      if (!isUnavailable) {
        const synomyms = [moment(dateStr).format("dddd")];
        if (i == 0) {
          synomyms.push("First available");
          synomyms.push("Tomorrow");
        }
        if (i > 6) {
          synomyms.push(`Next ${moment(dateStr).format("dddd")}`);
        } else if (i > 0 && i <= 6) {
          synomyms.push(`This ${moment(dateStr).format("dddd")}`);
        }
        availableDates.push({
          date: dateStr,
          dayOfWeek: moment(dateStr).format("dddd"),
          synomyms,
        });
      }
    }
  
    // response.availableDates = availableDates;
    //console.log('BOOM! ', availableDates)
  
    results.push({
      toolCallId: toolCall?.id,
      result: {
        availableDates,
      },
    });
  
    return results;
  }
  